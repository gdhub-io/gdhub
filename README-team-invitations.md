# Team Invitations System

This document describes the team invitation system in GDHub, which allows project founders to invite new members to their teams.

## Overview

The team invitation system consists of several components:
1. A modal dialog for sending invitations
2. API endpoints for handling invitations
3. Email templates for notifications
4. A process for handling onboarding requirements before adding users to teams

## Invitation Flow

### 1. Sending an Invitation

1. The project founder clicks the "Invite Member" button in the team members list
2. A modal dialog opens, allowing the founder to enter:
   - Email address of the invitee
   - Position in the team
   - Work direction
   - Start date
3. When the invitation is sent, the system:
   - Creates an invitation record in the database
   - Sends an email to the invitee with a link to accept the invitation

### 2. Accepting an Invitation

When a user receives an invitation email and clicks the "Accept Invitation" link:

1. If the user is not logged in, they are redirected to the login page
2. After logging in, the system checks if the user has:
   - Completed the onboarding process
   - Created at least one speciality

3. If the user has completed both requirements:
   - The user is immediately added to the team
   - The invitation status is updated to "ACCEPTED"
   - A notification is sent to the project founder

4. If the user has not completed the requirements:
   - The invitation status is updated to "ACCEPTED"
   - The invitation details are stored in the user's profile as a pending invitation
   - The user is redirected to the appropriate step (onboarding or speciality creation)
   - A notification is sent to the project founder indicating that the user has accepted but needs to complete additional steps

### 3. Completing Requirements

When a user completes the required steps (onboarding or speciality creation):

1. The system checks for pending invitations
2. If a pending invitation is found:
   - The user is added to the team
   - The pending invitation is removed from the user's profile
   - A notification is sent to the project founder
   - The user is redirected to the project page

## Database Schema

```prisma
// Invitation model
model Invitation {
  id          String      @id @default(cuid())
  email       String      
  position    String      
  directionId String      
  startedAt   DateTime    @default(now())
  status      String      @default("PENDING") // PENDING, ACCEPTED, DECLINED, EXPIRED
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  expiresAt   DateTime?   
  acceptedAt  DateTime?   

  team        Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId      String      
  
  invitedBy   User        @relation("SentInvitations", fields: [invitedById], references: [id])
  invitedById String      
  
  user        User?       @relation("ReceivedInvitations", fields: [userId], references: [id])
  userId      String?     

  @@index([teamId])
  @@index([invitedById])
  @@index([userId])
  @@index([email])
  @@index([status])
}

// User model updates
model User {
  // ... existing fields
  
  pendingTeamInvitations Json[] @default([])
  
  sentInvitations      Invitation[] @relation("SentInvitations")
  receivedInvitations  Invitation[] @relation("ReceivedInvitations")
}

// Team model updates
model Team {
  // ... existing fields
  
  invitations Invitation[]
}
```

## API Endpoints

1. `/api/user/project/team/invite` - Send an invitation
2. `/api/user/project/team/accept-invite` - Accept an invitation
3. `/api/user/project/team/complete-pending-invitation` - Complete a pending invitation after onboarding/speciality creation
4. `/api/invitation/[token]` - Get invitation details

## Email Templates

1. `team-invitation.html` - Invitation email sent to potential team members
2. `invitation-accepted.html` - Notification to the project founder when a user is immediately added to the team
3. `invitation-accepted-pending.html` - Notification to the project founder when a user accepts but needs to complete additional steps
4. `invitation-completed.html` - Notification to the project founder when a user completes all steps and is added to the team

## Components

1. `InviteMemberModal` - Modal dialog for sending invitations
2. `OnboardingCompleted` - Component that checks for pending invitations after onboarding
3. `SpecialityCreated` - Component that checks for pending invitations after speciality creation

## Implementation Notes

- The system uses the Novu service for sending email notifications
- Invitations expire after 7 days by default
- The `pendingTeamInvitations` field in the User model stores invitation details as JSON objects
- The system handles both registered and unregistered users 