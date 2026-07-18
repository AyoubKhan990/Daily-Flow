import express, { Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import {
  users,
  projects,
  categories,
  tasks,
  activityLogs,
  dailyNotes,
  dailyReviews,
  focusSessions,
  templates,
  templateTasks
} from "./src/db/schema.ts";
import { eq, and, or, gte, lte, desc, asc, not } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK if API Key is present
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Helper: Sync Firebase user to local PostgreSQL
const syncUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized: Missing user token details" });
  }
  try {
    const firebaseUid = req.user.uid;
    const email = req.user.email || `${firebaseUid}@dailyflow.local`;
    const name = req.user.name || email.split("@")[0];
    const photoUrl = req.user.picture || null;

    // Check if user exists
    const existingUsers = await db.select().from(users).where(eq(users.uid, firebaseUid)).limit(1);
    let dbUser = existingUsers[0];

    if (!dbUser) {
      const inserted = await db.insert(users)
        .values({
          uid: firebaseUid,
          email,
          name,
          photoUrl,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email, name, photoUrl },
        })
        .returning();
      dbUser = inserted[0];
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error("Database user sync failed:", error);
    res.status(500).json({ error: "Failed to synchronize user profile to database." });
  }
};

// ==========================================
// API ROUTES
// ==========================================

// 1. Natural Language Task Parsing with Gemini
app.post("/api/parse-task", requireAuth, syncUser, async (req: AuthRequest, res) => {
  const { text: inputText } = req.body;
  if (!inputText || typeof inputText !== "string") {
    return res.status(400).json({ error: "Task text is required." });
  }

  if (!ai) {
    return res.status(503).json({
      error: "Gemini AI parsing service is not configured (missing key). Please create the task manually.",
    });
  }

  try {
    const localTimeStr = new Date().toISOString();
    const prompt = `You are the natural language engine for DailyFlow, a productivity app. 
Analyze the task input string and extract structural components.
The current local time of the user is: ${localTimeStr}.

Format your output as a clean, single JSON object (with NO markdown, NO code block ticks, just the raw JSON text) with the following fields:
- title: string (the main action/title, capitalized nicely, e.g., "Submit report", "Call client")
- date: string or null (YYYY-MM-DD. Calculate relative dates like 'tomorrow', 'Friday', 'next Monday' relative to current time)
- startTime: string or null (HH:MM format, e.g. "17:00" for 5 PM)
- recurrenceRule: string ('none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly')

Input: "${inputText}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const outputText = response.text?.trim() || "{}";
    // Strip markdown codeblock backticks if present
    const sanitizedJson = outputText.replace(/^```json\s*|```$/g, "").trim();
    const result = JSON.parse(sanitizedJson);

    res.json(result);
  } catch (error) {
    console.error("Gemini NLP parsing failed:", error);
    res.status(500).json({ error: "Natural language engine error." });
  }
});

// 2. User Settings / Profile
app.get("/api/user/profile", requireAuth, syncUser, async (req: AuthRequest, res) => {
  res.json(req.dbUser);
});

app.put("/api/user/profile", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      photoUrl,
      timezone,
      startOfWeek,
      theme,
      streakRule,
      streakPercent,
      defaultPriority,
      defaultDuration,
      defaultReminder,
      dailyPlanningReminder,
      endOfDayReviewReminder,
    } = req.body;

    const updated = await db.update(users)
      .set({
        name,
        photoUrl,
        timezone,
        startOfWeek,
        theme,
        streakRule,
        streakPercent,
        defaultPriority,
        defaultDuration,
        defaultReminder,
        dailyPlanningReminder,
        endOfDayReviewReminder,
      })
      .where(eq(users.id, req.dbUser!.id))
      .returning();

    res.json(updated[0]);
  } catch (error) {
    console.error("Failed to update user profile:", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// ==========================================
// 2b. ADMIN & TEAM ROUTES
// ==========================================
app.put("/api/user/role", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    if (role !== "admin" && role !== "member") {
      return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'member'." });
    }
    const updated = await db.update(users)
      .set({ role })
      .where(eq(users.id, req.dbUser!.id))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error("Failed to update user role:", error);
    res.status(500).json({ error: "Failed to update role." });
  }
});

app.post("/api/user/join-team", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: "Invite code (Admin email or UID) is required." });
    }

    const cleanCode = inviteCode.trim();

    // Find admin by UID or Email
    const adminCandidates = await db.select().from(users).where(
      or(
        eq(users.uid, cleanCode),
        eq(users.email, cleanCode.toLowerCase())
      )
    ).limit(1);

    if (adminCandidates.length === 0) {
      return res.status(404).json({ error: "Admin not found. Please verify the UID or email address." });
    }

    const adminUser = adminCandidates[0];
    if (adminUser.role !== "admin") {
      return res.status(400).json({ error: "The specified user is not an Admin." });
    }

    if (adminUser.id === req.dbUser!.id) {
      return res.status(400).json({ error: "You cannot join your own team as a member." });
    }

    const updated = await db.update(users)
      .set({ adminId: adminUser.id })
      .where(eq(users.id, req.dbUser!.id))
      .returning();

    res.json({
      success: true,
      message: `Successfully joined ${adminUser.name || adminUser.email}'s team!`,
      profile: updated[0]
    });
  } catch (error) {
    console.error("Failed to join team:", error);
    res.status(500).json({ error: "Failed to join team." });
  }
});

app.post("/api/user/leave-team", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(users)
      .set({ adminId: null })
      .where(eq(users.id, req.dbUser!.id))
      .returning();
    res.json({
      success: true,
      message: "Successfully left the team.",
      profile: updated[0]
    });
  } catch (error) {
    console.error("Failed to leave team:", error);
    res.status(500).json({ error: "Failed to leave team." });
  }
});

app.get("/api/admin/team", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    if (req.dbUser!.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Only admins can view team details." });
    }

    // Fetch team members
    const teamMembers = await db.select().from(users).where(eq(users.adminId, req.dbUser!.id));

    const teamData = [];
    for (const member of teamMembers) {
      // Fetch member's tasks (non-archived)
      const memberTasks = await db.select().from(tasks).where(
        and(
          eq(tasks.userId, member.id),
          eq(tasks.isArchived, false)
        )
      ).orderBy(desc(tasks.createdAt));

      const totalTasks = memberTasks.length;
      const completedTasks = memberTasks.filter(t => t.status === "completed").length;
      const pendingTasks = totalTasks - completedTasks;

      teamData.push({
        id: member.id,
        uid: member.uid,
        name: member.name,
        email: member.email,
        photoUrl: member.photoUrl,
        metrics: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks
        },
        tasks: memberTasks
      });
    }

    res.json(teamData);
  } catch (error) {
    console.error("Failed to fetch team details:", error);
    res.status(500).json({ error: "Failed to fetch team details." });
  }
});

// 3. Projects
app.get("/api/projects", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userProjects = await db.select().from(projects).where(eq(projects.userId, req.dbUser!.id));
    res.json(userProjects);
  } catch (error) {
    console.error("Get projects failed:", error);
    res.status(500).json({ error: "Failed to fetch projects." });
  }
});

app.post("/api/projects", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const { name, description, color, icon, deadline } = req.body;
    if (!name) return res.status(400).json({ error: "Project name is required" });

    const newProject = await db.insert(projects)
      .values({
        userId: req.dbUser!.id,
        name,
        description,
        color,
        icon: icon || "Folder",
        deadline,
      })
      .returning();

    res.json(newProject[0]);
  } catch (error) {
    console.error("Create project failed:", error);
    res.status(500).json({ error: "Failed to create project." });
  }
});

app.put("/api/projects/:id", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, color, icon, deadline, isArchived } = req.body;

    const updated = await db.update(projects)
      .set({ name, description, color, icon, deadline, isArchived })
      .where(and(eq(projects.id, id), eq(projects.userId, req.dbUser!.id)))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: "Project not found" });
    res.json(updated[0]);
  } catch (error) {
    console.error("Update project failed:", error);
    res.status(500).json({ error: "Failed to update project." });
  }
});

app.delete("/api/projects/:id", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, req.dbUser!.id)))
      .returning();

    if (deleted.length === 0) return res.status(404).json({ error: "Project not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete project failed:", error);
    res.status(500).json({ error: "Failed to delete project." });
  }
});

// 4. Categories
app.get("/api/categories", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(categories).where(eq(categories.userId, req.dbUser!.id));
    res.json(list);
  } catch (error) {
    console.error("Get categories failed:", error);
    res.status(500).json({ error: "Failed to fetch categories." });
  }
});

app.post("/api/categories", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const newCat = await db.insert(categories)
      .values({
        userId: req.dbUser!.id,
        name,
        color,
      })
      .returning();

    res.json(newCat[0]);
  } catch (error) {
    console.error("Create category failed:", error);
    res.status(500).json({ error: "Failed to create category." });
  }
});

app.delete("/api/categories/:id", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, req.dbUser!.id)))
      .returning();

    if (deleted.length === 0) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete category failed:", error);
    res.status(500).json({ error: "Failed to delete category." });
  }
});

// 5. Tasks CRUD
app.get("/api/tasks", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    // Base tasks select
    const list = await db.select().from(tasks).where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isArchived, false)
      )
    ).orderBy(asc(tasks.taskOrder), desc(tasks.createdAt));

    res.json(list);
  } catch (error) {
    console.error("Get tasks failed:", error);
    res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

app.post("/api/tasks", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const body = req.body;

    if (!body.title) return res.status(400).json({ error: "Title is required" });

    const inserted = await db.insert(tasks)
      .values({
        userId,
        title: body.title,
        description: body.description || null,
        date: body.date || null,
        startTime: body.startTime || null,
        dueTime: body.dueTime || null,
        isAllDay: !!body.isAllDay,
        priority: body.priority || "medium",
        status: body.status || "pending",
        projectId: body.projectId || null,
        categoryId: body.categoryId || null,
        tags: body.tags || [],
        estDuration: body.estDuration || 0,
        actDuration: body.actDuration || 0,
        notes: body.notes || null,
        checklist: body.checklist || [],
        reminderTime: body.reminderTime || null,
        recurrenceRule: body.recurrenceRule || "none",
        parentTaskId: body.parentTaskId || null,
        taskColor: body.taskColor || null,
        taskOrder: body.taskOrder || 0,
      })
      .returning();

    const newTask = inserted[0];

    // Log activity
    await db.insert(activityLogs).values({
      taskId: newTask.id,
      userId,
      action: "created",
      details: "Task created manually",
    });

    res.json(newTask);
  } catch (error) {
    console.error("Create task failed:", error);
    res.status(500).json({ error: "Failed to create task." });
  }
});

app.put("/api/tasks/:id", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const taskId = parseInt(req.params.id);
    const body = req.body;

    // Get original task to log status/date/priority changes
    const original = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).limit(1);
    if (original.length === 0) return res.status(404).json({ error: "Task not found" });
    const originalTask = original[0];

    // Update values
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.startTime !== undefined) updateData.startTime = body.startTime;
    if (body.dueTime !== undefined) updateData.dueTime = body.dueTime;
    if (body.isAllDay !== undefined) updateData.isAllDay = body.isAllDay;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "completed" && originalTask.status !== "completed") {
        updateData.completionDate = new Date().toISOString();
      } else if (body.status !== "completed") {
        updateData.completionDate = null;
      }
    }
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.estDuration !== undefined) updateData.estDuration = body.estDuration;
    if (body.actDuration !== undefined) updateData.actDuration = body.actDuration;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.checklist !== undefined) updateData.checklist = body.checklist;
    if (body.reminderTime !== undefined) updateData.reminderTime = body.reminderTime;
    if (body.recurrenceRule !== undefined) updateData.recurrenceRule = body.recurrenceRule;
    if (body.parentTaskId !== undefined) updateData.parentTaskId = body.parentTaskId;
    if (body.taskColor !== undefined) updateData.taskColor = body.taskColor;
    if (body.taskOrder !== undefined) updateData.taskOrder = body.taskOrder;
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;

    const updated = await db.update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    const updatedTask = updated[0];

    // Log activities for changed fields
    const logsToInsert = [];
    if (body.status && body.status !== originalTask.status) {
      logsToInsert.push({
        taskId,
        userId,
        action: "status_changed",
        details: `Status changed from ${originalTask.status} to ${body.status}`,
      });
    }
    if (body.date && body.date !== originalTask.date) {
      logsToInsert.push({
        taskId,
        userId,
        action: "date_changed",
        details: `Scheduled date changed from ${originalTask.date || "Inbox"} to ${body.date}`,
      });
    }
    if (body.priority && body.priority !== originalTask.priority) {
      logsToInsert.push({
        taskId,
        userId,
        action: "priority_changed",
        details: `Priority changed from ${originalTask.priority} to ${body.priority}`,
      });
    }

    if (logsToInsert.length > 0) {
      await db.insert(activityLogs).values(logsToInsert);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Update task failed:", error);
    res.status(500).json({ error: "Failed to update task." });
  }
});

app.delete("/api/tasks/:id", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const taskId = parseInt(req.params.id);

    // Soft delete / archive to maintain history
    const updated = await db.update(tasks)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: "Task not found" });
    res.json({ success: true, message: "Task archived successfully to maintain statistics." });
  } catch (error) {
    console.error("Delete task failed:", error);
    res.status(500).json({ error: "Failed to delete task." });
  }
});

// 6. Activity Logs
app.get("/api/tasks/:id/logs", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const taskId = parseInt(req.params.id);

    const logs = await db.select().from(activityLogs)
      .where(and(eq(activityLogs.taskId, taskId), eq(activityLogs.userId, userId)))
      .orderBy(desc(activityLogs.createdAt));

    res.json(logs);
  } catch (error) {
    console.error("Get logs failed:", error);
    res.status(500).json({ error: "Failed to fetch activity logs." });
  }
});

// 7. Daily Notes (planning, goals, top 3)
app.get("/api/daily-notes/:date", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const date = req.params.date; // YYYY-MM-DD

    const notes = await db.select().from(dailyNotes)
      .where(and(eq(dailyNotes.date, date), eq(dailyNotes.userId, userId)))
      .limit(1);

    if (notes.length === 0) {
      return res.json({ date, content: "", topThreeTasks: [], dailyGoal: "" });
    }
    res.json(notes[0]);
  } catch (error) {
    console.error("Get daily notes failed:", error);
    res.status(500).json({ error: "Failed to fetch daily planning." });
  }
});

app.post("/api/daily-notes/:date", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const date = req.params.date;
    const { content, topThreeTasks, dailyGoal } = req.body;

    const existing = await db.select().from(dailyNotes)
      .where(and(eq(dailyNotes.date, date), eq(dailyNotes.userId, userId)))
      .limit(1);

    let saved;
    if (existing.length > 0) {
      saved = await db.update(dailyNotes)
        .set({ content, topThreeTasks: topThreeTasks || [], dailyGoal })
        .where(eq(dailyNotes.id, existing[0].id))
        .returning();
    } else {
      saved = await db.insert(dailyNotes)
        .values({
          userId,
          date,
          content,
          topThreeTasks: topThreeTasks || [],
          dailyGoal,
        })
        .returning();
    }

    res.json(saved[0]);
  } catch (error) {
    console.error("Save daily notes failed:", error);
    res.status(500).json({ error: "Failed to save daily planning." });
  }
});

// 8. Daily Reviews
app.get("/api/daily-reviews/:date", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const date = req.params.date;

    const reviews = await db.select().from(dailyReviews)
      .where(and(eq(dailyReviews.date, date), eq(dailyReviews.userId, userId)))
      .limit(1);

    if (reviews.length === 0) {
      return res.json({ date, biggestAchievement: "", unfinishedReason: "", notesForTomorrow: "" });
    }
    res.json(reviews[0]);
  } catch (error) {
    console.error("Get daily review failed:", error);
    res.status(500).json({ error: "Failed to fetch daily review." });
  }
});

app.post("/api/daily-reviews/:date", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const date = req.params.date;
    const { biggestAchievement, unfinishedReason, notesForTomorrow } = req.body;

    const existing = await db.select().from(dailyReviews)
      .where(and(eq(dailyReviews.date, date), eq(dailyReviews.userId, userId)))
      .limit(1);

    let saved;
    if (existing.length > 0) {
      saved = await db.update(dailyReviews)
        .set({ biggestAchievement, unfinishedReason, notesForTomorrow })
        .where(eq(dailyReviews.id, existing[0].id))
        .returning();
    } else {
      saved = await db.insert(dailyReviews)
        .values({
          userId,
          date,
          biggestAchievement,
          unfinishedReason,
          notesForTomorrow,
        })
        .returning();
    }

    res.json(saved[0]);
  } catch (error) {
    console.error("Save daily review failed:", error);
    res.status(500).json({ error: "Failed to save daily review." });
  }
});

// 9. Focus Sessions
app.get("/api/focus-sessions", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(focusSessions)
      .where(eq(focusSessions.userId, req.dbUser!.id))
      .orderBy(desc(focusSessions.createdAt));
    res.json(list);
  } catch (error) {
    console.error("Get focus sessions failed:", error);
    res.status(500).json({ error: "Failed to fetch focus sessions." });
  }
});

app.post("/api/focus-sessions", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const { taskId, duration, type } = req.body;

    const logged = await db.insert(focusSessions)
      .values({
        userId,
        taskId: taskId || null,
        duration,
        type: type || "pomodoro",
      })
      .returning();

    // If connected to a task, increment its actual duration
    if (taskId) {
      const existing = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (existing.length > 0) {
        await db.update(tasks)
          .set({ actDuration: (existing[0].actDuration || 0) + duration, updatedAt: new Date() })
          .where(eq(tasks.id, taskId));

        // Log focus session activity
        await db.insert(activityLogs).values({
          taskId,
          userId,
          action: "edited",
          details: `Completed a focus session of ${duration} minutes. Total time spent updated.`,
        });
      }
    }

    res.json(logged[0]);
  } catch (error) {
    console.error("Create focus session failed:", error);
    res.status(500).json({ error: "Failed to log focus session." });
  }
});

// 10. Templates
app.get("/api/templates", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    // Get templates
    const tmpls = await db.select().from(templates).where(eq(templates.userId, userId));
    const result = [];

    for (const t of tmpls) {
      const items = await db.select().from(templateTasks).where(eq(templateTasks.templateId, t.id));
      result.push({
        ...t,
        tasks: items,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Get templates failed:", error);
    res.status(500).json({ error: "Failed to fetch templates." });
  }
});

app.post("/api/templates", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const { name, description, tasks: tmplTasks } = req.body;

    if (!name) return res.status(400).json({ error: "Template name is required" });

    const insertedTmpl = await db.insert(templates)
      .values({ userId, name, description })
      .returning();
    const templateId = insertedTmpl[0].id;

    const createdTasks = [];
    if (tmplTasks && Array.isArray(tmplTasks)) {
      for (const t of tmplTasks) {
        const item = await db.insert(templateTasks)
          .values({
            templateId,
            title: t.title,
            description: t.description || null,
            priority: t.priority || "medium",
            projectId: t.projectId || null,
            categoryId: t.categoryId || null,
            estDuration: t.estDuration || 0,
            checklist: t.checklist || [],
          })
          .returning();
        createdTasks.push(item[0]);
      }
    }

    res.json({
      ...insertedTmpl[0],
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("Create template failed:", error);
    res.status(500).json({ error: "Failed to create template." });
  }
});

app.post("/api/templates/:id/apply", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const templateId = parseInt(req.params.id);
    const { date } = req.body; // YYYY-MM-DD

    if (!date) return res.status(400).json({ error: "Target date is required" });

    const tmpl = await db.select().from(templates).where(and(eq(templates.id, templateId), eq(templates.userId, userId))).limit(1);
    if (tmpl.length === 0) return res.status(404).json({ error: "Template not found" });

    const tmplTasks = await db.select().from(templateTasks).where(eq(templateTasks.templateId, templateId));

    const insertedTasks = [];
    for (const t of tmplTasks) {
      const inserted = await db.insert(tasks)
        .values({
          userId,
          title: t.title,
          description: t.description,
          date,
          priority: t.priority,
          status: "pending",
          projectId: t.projectId,
          categoryId: t.categoryId,
          estDuration: t.estDuration,
          checklist: t.checklist || [],
        })
        .returning();

      insertedTasks.push(inserted[0]);

      // Log activity
      await db.insert(activityLogs).values({
        taskId: inserted[0].id,
        userId,
        action: "created",
        details: `Created from template "${tmpl[0].name}"`,
      });
    }

    res.json({ success: true, count: insertedTasks.length, tasks: insertedTasks });
  } catch (error) {
    console.error("Apply template failed:", error);
    res.status(500).json({ error: "Failed to apply template tasks." });
  }
});

app.delete("/api/templates/:id", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const templateId = parseInt(req.params.id);

    const deleted = await db.delete(templates)
      .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
      .returning();

    if (deleted.length === 0) return res.status(404).json({ error: "Template not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete template failed:", error);
    res.status(500).json({ error: "Failed to delete template." });
  }
});

// 11. Productivity Analytics and Streak Metrics
app.get("/api/analytics", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;

    // Fetch all user's tasks
    const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
    const allFocus = await db.select().from(focusSessions).where(eq(focusSessions.userId, userId));

    res.json({
      allTasks,
      allFocus,
    });
  } catch (error) {
    console.error("Analytics fetch failed:", error);
    res.status(500).json({ error: "Failed to fetch analytics metrics." });
  }
});

app.get("/api/streak", requireAuth, syncUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const rule = req.dbUser!.streakRule || "one_completed";
    const percent = req.dbUser!.streakPercent || 80;

    // Fetch all user's non-archived tasks with a scheduled date
    const allTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isArchived, false)
      )
    );

    // Group tasks by date
    const tasksByDate: Record<string, { total: number; completed: number }> = {};
    for (const task of allTasks) {
      if (!task.date) continue; // Skip tasks with no date (Inbox/Quick capture)
      const d = task.date; // "YYYY-MM-DD"
      if (!tasksByDate[d]) {
        tasksByDate[d] = { total: 0, completed: 0 };
      }
      tasksByDate[d].total++;
      if (task.status === "completed") {
        tasksByDate[d].completed++;
      }
    }

    // Determine which dates met the streak criteria
    const eligibleDates = new Set<string>();
    for (const [dateStr, counts] of Object.entries(tasksByDate)) {
      if (rule === "one_completed") {
        if (counts.completed >= 1) {
          eligibleDates.add(dateStr);
        }
      } else if (rule === "percent_completed") {
        const rate = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;
        if (rate >= percent) {
          eligibleDates.add(dateStr);
        }
      }
    }

    // If there are no eligible dates, streak is 0
    if (eligibleDates.size === 0) {
      return res.json({ current: 0, longest: 0 });
    }

    // Sort unique eligible dates ascending
    const sortedDates = Array.from(eligibleDates).sort();

    // Helper to calculate longest streak overall
    let longest = 0;
    let currentTemp = 0;
    let prevDate: Date | null = null;

    for (const dStr of sortedDates) {
      const curDate = new Date(dStr);
      if (!prevDate) {
        currentTemp = 1;
      } else {
        const diffTime = Math.abs(curDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          currentTemp++;
        } else {
          if (currentTemp > longest) longest = currentTemp;
          currentTemp = 1;
        }
      }
      prevDate = curDate;
    }
    if (currentTemp > longest) longest = currentTemp;

    // Calculate current streak (counting back from today/yesterday)
    // Get user local time or UTC
    const today = new Date();
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const todayStr = formatDate(today);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    let current = 0;
    let checkDate = today;

    // If neither today nor yesterday has met the streak eligibility, the current streak is 0
    if (eligibleDates.has(todayStr)) {
      current = 1;
      checkDate = today;
    } else if (eligibleDates.has(yesterdayStr)) {
      current = 1;
      checkDate = yesterday;
    } else {
      current = 0;
    }

    if (current > 0) {
      // Loop backwards to count consecutive previous days
      let loop = true;
      while (loop) {
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        const prevStr = formatDate(prev);
        if (eligibleDates.has(prevStr)) {
          current++;
          checkDate = prev;
        } else {
          loop = false;
        }
      }
    }

    // Ensure longest is at least current
    if (current > longest) longest = current;

    res.json({
      current,
      longest
    });
  } catch (error) {
    console.error("Streak calculation failed:", error);
    res.status(500).json({ error: "Failed to calculate streaks." });
  }
});

// ==========================================
// VITE OR STATIC SERVING MIDDLEWARE
// ==========================================
(async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DailyFlow full-stack server running on http://localhost:${PORT}`);
  });
})();
