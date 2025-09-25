import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Enums for better type safety and readability
const RoleEnum = v.union(v.literal('job-seeker'), v.literal('company'));
const JobStatusEnum = v.union(v.literal('Active'), v.literal('Closed'));
const ApplicationStatusEnum = v.union(
  v.literal('New'),
  v.literal('In Review'),
  v.literal('Interviewing'),
  v.literal('Hired'),
  v.literal('Rejected'),
);
const GenderEnum = v.union(
  v.literal('Male'),
  v.literal('Female'),
  v.literal('Other'),
  v.literal('Prefer not to say'),
);
const JobTypeEnum = v.union(
  v.literal('Full-time'),
  v.literal('Part-time'),
  v.literal('Contract'),
  v.literal('Internship'),
  v.literal('Temporary'),
);

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    email: v.optional(v.string()),
    role: RoleEnum,
    phoneVerified: v.optional(v.boolean()),
    passwordHash: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_phone', ['phone']),

  profiles: defineTable({
    userId: v.id('users'),
    name: v.string(),
    contactNumber: v.string(),
    createdAt: v.number(),

    jobSeekerData: v.optional(
      v.object({
        dateOfBirth: v.number(),
        gender: GenderEnum,
        education: v.string(),
        jobRole: v.string(),
        experience: v.string(),
        location: v.string(),
        skills: v.array(v.string()),
        profilePhotoUrl: v.optional(v.string()),
      }),
    ),

    companyData: v.optional(
      v.object({
        companyName: v.string(),
        contactPerson: v.string(),
        email: v.string(),
        companyAddress: v.string(),
        aboutCompany: v.string(),
        companyPhotoUrl: v.string(),
      }),
    ),
  }).index('by_userId', ['userId']),

  jobs: defineTable({
    companyId: v.id('profiles'),
    title: v.string(),
    location: v.object({
      city: v.string(),
      locality: v.optional(v.string()),
    }),
    salary: v.object({
      min: v.number(),
      max: v.number(),
    }),
    jobType: JobTypeEnum,
    staffNeeded: v.number(),
    genderRequirement: GenderEnum,
    educationRequirements: v.array(v.string()),
    experienceRequired: v.string(),
    description: v.string(),
    status: JobStatusEnum,
    createdAt: v.number(),
  })
    .index('by_companyId', ['companyId'])
    .index('by_status_createdAt', ['status', 'createdAt'])
    .index('by_createdAt', ['createdAt'])
    .index('by_status_salary', ['status', 'salary.max']),

  applications: defineTable({
    jobId: v.id('jobs'),
    jobSeekerId: v.id('profiles'),
    status: ApplicationStatusEnum,
    appliedAt: v.number(),
  })
    .index('by_jobId', ['jobId'])
    .index('by_jobSeekerId', ['jobSeekerId']),

  otps: defineTable({
    phone: v.string(),
    codeHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumed: v.boolean(),
    attempts: v.number(),
    purpose: v.optional(v.string()),
  }).index('by_phone', ['phone']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    revoked: v.boolean(),
  })
    .index('by_token', ['token'])
    .index('by_userId', ['userId']),

  // Notifications for companies (e.g., new applicant, job status changes)
  notifications: defineTable({
    companyId: v.id('profiles'),
    type: v.string(), // e.g., 'application:new', 'job:closed'
    title: v.string(),
    body: v.string(),
    jobId: v.optional(v.id('jobs')),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_companyId', ['companyId'])
    .index('by_companyId_createdAt', ['companyId', 'createdAt']),

  // Conversations between a job seeker and a company (usually tied to an application)
  conversations: defineTable({
    participantA: v.id('profiles'), // Deterministic lower sorted id
    participantB: v.id('profiles'), // Deterministic higher sorted id
    applicationId: v.optional(v.id('applications')),
    lastMessageAt: v.number(),
    lastMessageId: v.optional(v.id('messages')),
    unreadA: v.number(), // unread count for participantA
    unreadB: v.number(), // unread count for participantB
    createdAt: v.number(),
  })
    .index('by_participantA_lastMessageAt', ['participantA', 'lastMessageAt'])
    .index('by_participantB_lastMessageAt', ['participantB', 'lastMessageAt'])
    .index('by_applicationId', ['applicationId'])
    .index('by_createdAt', ['createdAt']),

  // Individual messages for a conversation
  messages: defineTable({
    conversationId: v.id('conversations'),
    senderId: v.id('profiles'),
    body: v.string(),
    kind: v.union(v.literal('user'), v.literal('system')),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
  })
    .index('by_conversation_createdAt', ['conversationId', 'createdAt'])
    .index('by_sender_createdAt', ['senderId', 'createdAt']),
});
