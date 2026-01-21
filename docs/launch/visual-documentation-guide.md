# Visual Documentation Guide

**Document Version:** 1.0  
**Created:** January 6, 2026  
**Author:** Emma (Product Manager)  
**Purpose:** Comprehensive visual elements to enhance platform documentation

---

## Table of Contents

1. [User Journey Diagrams](#1-user-journey-diagrams)
2. [Workflow Diagrams](#2-workflow-diagrams)
3. [Architecture Diagrams](#3-architecture-diagrams)
4. [Feature Screenshots Guide](#4-feature-screenshots-guide)
5. [UI Component Diagrams](#5-ui-component-diagrams)
6. [Data Flow Diagrams](#6-data-flow-diagrams)

---

## 1. User Journey Diagrams

### 1.1 Landlord Onboarding Journey

```mermaid
journey
    title Landlord Onboarding Journey
    section Discovery
      Visit website: 5: Landlord
      Read features: 4: Landlord
      Watch demo video: 5: Landlord
    section Sign Up
      Create account: 5: Landlord
      Email verification: 4: Landlord
      Complete profile: 4: Landlord
    section Setup
      Add first property: 5: Landlord
      Upload property photos: 4: Landlord
      Set rental terms: 4: Landlord
    section First Actions
      Create lease: 5: Landlord
      Invite tenant: 5: Landlord
      Set up payments: 5: Landlord
    section Success
      Receive first payment: 5: Landlord
      Track maintenance: 5: Landlord
      View analytics: 5: Landlord
```

### 1.2 Tenant Onboarding Journey

```mermaid
journey
    title Tenant Onboarding Journey
    section Discovery
      Receive invite: 5: Tenant
      Click invite link: 5: Tenant
      View property details: 5: Tenant
    section Sign Up
      Create account: 5: Tenant
      Email verification: 4: Tenant
      Complete profile: 4: Tenant
    section Lease Review
      Review lease terms: 4: Tenant
      Ask questions: 4: Tenant
      E-sign lease: 5: Tenant
    section Setup
      Add payment method: 5: Tenant
      Set up autopay: 5: Tenant
      Download mobile app: 4: Tenant
    section Active Use
      Make rent payment: 5: Tenant
      Submit maintenance: 5: Tenant
      Message landlord: 5: Tenant
```

### 1.3 Property Manager Journey

```mermaid
journey
    title Property Manager Multi-Property Journey
    section Setup
      Import properties: 4: Manager
      Invite team members: 5: Manager
      Configure permissions: 4: Manager
    section Daily Operations
      Review dashboard: 5: Manager
      Approve maintenance: 4: Manager
      Process payments: 5: Manager
    section Team Collaboration
      Assign tasks: 5: Manager
      Review team activity: 4: Manager
      Generate reports: 5: Manager
    section Growth
      Add new properties: 5: Manager
      Analyze performance: 5: Manager
      Optimize operations: 4: Manager
```

---

## 2. Workflow Diagrams

### 2.1 Lease Creation Workflow

```mermaid
flowchart TD
    Start([Landlord Starts Lease]) --> SelectProperty[Select Property]
    SelectProperty --> PropertyAvailable{Property Available?}
    PropertyAvailable -->|No| UpdateProperty[Update Property Status]
    UpdateProperty --> SelectProperty
    PropertyAvailable -->|Yes| AddTenant[Add Tenant Information]
    
    AddTenant --> TenantExists{Tenant in System?}
    TenantExists -->|No| InviteTenant[Send Tenant Invite]
    InviteTenant --> WaitAccept[Wait for Acceptance]
    WaitAccept --> TenantAccepted{Accepted?}
    TenantAccepted -->|No| ResendOrCancel{Resend or Cancel?}
    ResendOrCancel -->|Resend| InviteTenant
    ResendOrCancel -->|Cancel| End([End])
    TenantAccepted -->|Yes| SetTerms[Set Lease Terms]
    TenantExists -->|Yes| SetTerms
    
    SetTerms --> DefineRent[Define Rent Amount]
    DefineRent --> SetDeposit[Set Security Deposit]
    SetDeposit --> SetDates[Set Start/End Dates]
    SetDates --> AddPolicies[Add Policies & Rules]
    AddPolicies --> UploadDocs[Upload Documents]
    
    UploadDocs --> ReviewLease[Review Lease]
    ReviewLease --> Correct{All Correct?}
    Correct -->|No| EditLease[Edit Lease Details]
    EditLease --> ReviewLease
    Correct -->|Yes| GenerateDoc[Generate Lease Document]
    
    GenerateDoc --> SendSignature[Send for E-Signature]
    SendSignature --> LandlordSign[Landlord Signs]
    LandlordSign --> TenantSign[Tenant Signs]
    TenantSign --> AllSigned{All Signed?}
    AllSigned -->|No| Reminder[Send Reminder]
    Reminder --> TenantSign
    AllSigned -->|Yes| ActivateLease[Activate Lease]
    
    ActivateLease --> SetupPayments[Setup Payment Schedule]
    SetupPayments --> SendWelcome[Send Welcome Email]
    SendWelcome --> UpdateProperty[Update Property Status to Occupied]
    UpdateProperty --> Success([Lease Active])
```

### 2.2 Maintenance Request Workflow

```mermaid
flowchart TD
    Start([Tenant Submits Request]) --> FillForm[Fill Request Form]
    FillForm --> AddDetails[Add Description & Photos]
    AddDetails --> SelectPriority[Select Priority Level]
    SelectPriority --> Submit[Submit Request]
    
    Submit --> Notify[Notify Landlord]
    Notify --> LandlordReview[Landlord Reviews]
    LandlordReview --> Urgent{Emergency?}
    
    Urgent -->|Yes| ImmediateAction[Immediate Response]
    ImmediateAction --> AssignVendor[Assign Vendor/Self]
    
    Urgent -->|No| Assess[Assess Request]
    Assess --> ValidRequest{Valid Request?}
    ValidRequest -->|No| Decline[Decline with Reason]
    Decline --> NotifyTenant1[Notify Tenant]
    NotifyTenant1 --> End([End])
    
    ValidRequest -->|Yes| Approve[Approve Request]
    Approve --> AssignVendor
    
    AssignVendor --> VendorType{Vendor Type?}
    VendorType -->|Internal| SelfSchedule[Landlord Schedules]
    VendorType -->|External| InviteVendor[Invite Vendor]
    InviteVendor --> VendorAccepts{Vendor Accepts?}
    VendorAccepts -->|No| FindAnother[Find Another Vendor]
    FindAnother --> InviteVendor
    VendorAccepts -->|Yes| Schedule[Schedule Appointment]
    SelfSchedule --> Schedule
    
    Schedule --> NotifyTenant2[Notify Tenant of Schedule]
    NotifyTenant2 --> WorkInProgress[Work In Progress]
    WorkInProgress --> UpdateStatus[Update Status Regularly]
    UpdateStatus --> WorkComplete{Work Complete?}
    WorkComplete -->|No| UpdateStatus
    
    WorkComplete -->|Yes| UploadPhotos[Upload After Photos]
    UploadPhotos --> AddCost[Add Cost Details]
    AddCost --> TenantReview[Tenant Reviews Work]
    TenantReview --> Satisfied{Satisfied?}
    
    Satisfied -->|No| ReportIssue[Report Issue]
    ReportIssue --> ReworkNeeded[Schedule Rework]
    ReworkNeeded --> WorkInProgress
    
    Satisfied -->|Yes| RateService[Rate Service]
    RateService --> CloseRequest[Close Request]
    CloseRequest --> ProcessPayment[Process Vendor Payment]
    ProcessPayment --> UpdateRecords[Update Maintenance Records]
    UpdateRecords --> Success([Request Completed])
```

### 2.3 Payment Processing Workflow

```mermaid
flowchart TD
    Start([Payment Due Date Approaching]) --> SendReminder[Send Payment Reminder]
    SendReminder --> DaysBeforeDue{Days Before Due?}
    DaysBeforeDue -->|7 days| Reminder1[First Reminder]
    DaysBeforeDue -->|3 days| Reminder2[Second Reminder]
    DaysBeforeDue -->|1 day| Reminder3[Final Reminder]
    
    Reminder1 --> WaitDueDate[Wait for Due Date]
    Reminder2 --> WaitDueDate
    Reminder3 --> WaitDueDate
    
    WaitDueDate --> DueDate[Payment Due Date]
    DueDate --> AutoPay{Autopay Enabled?}
    
    AutoPay -->|Yes| ProcessAuto[Process Automatic Payment]
    ProcessAuto --> PaymentSuccess1{Payment Success?}
    PaymentSuccess1 -->|Yes| RecordPayment[Record Payment]
    PaymentSuccess1 -->|No| NotifyFailure[Notify Payment Failed]
    NotifyFailure --> ManualPayment[Request Manual Payment]
    
    AutoPay -->|No| ManualPayment
    ManualPayment --> TenantPays{Tenant Pays?}
    TenantPays -->|Yes| SelectMethod[Select Payment Method]
    SelectMethod --> ProcessManual[Process Payment]
    ProcessManual --> PaymentSuccess2{Payment Success?}
    PaymentSuccess2 -->|Yes| RecordPayment
    PaymentSuccess2 -->|No| RetryPayment[Retry Payment]
    RetryPayment --> ProcessManual
    
    TenantPays -->|No| GracePeriod{Within Grace Period?}
    GracePeriod -->|Yes| WaitGrace[Wait for Payment]
    WaitGrace --> TenantPays
    
    GracePeriod -->|No| CalculateLateFee[Calculate Late Fee]
    CalculateLateFee --> SendLateNotice[Send Late Payment Notice]
    SendLateNotice --> AddLateFee[Add Late Fee to Balance]
    AddLateFee --> EscalationNeeded{Escalation Needed?}
    
    EscalationNeeded -->|No| ContinueReminders[Continue Reminders]
    ContinueReminders --> TenantPays
    
    EscalationNeeded -->|Yes| LegalAction[Initiate Legal Process]
    LegalAction --> End([Escalated])
    
    RecordPayment --> GenerateReceipt[Generate Receipt]
    GenerateReceipt --> SendReceipt[Send Receipt to Tenant]
    SendReceipt --> UpdateLedger[Update Financial Ledger]
    UpdateLedger --> NotifyLandlord[Notify Landlord]
    NotifyLandlord --> DistributeFunds[Distribute Funds]
    DistributeFunds --> Success([Payment Complete])
```

### 2.4 Lease Renewal Workflow

```mermaid
flowchart TD
    Start([60 Days Before Expiration]) --> CheckAutoRenew{Auto-Renew Enabled?}
    
    CheckAutoRenew -->|Yes| ReviewTerms[Review Current Terms]
    ReviewTerms --> AdjustRent{Adjust Rent?}
    AdjustRent -->|Yes| CalculateIncrease[Calculate Rent Increase]
    CalculateIncrease --> NotifyIncrease[Notify Tenant of Increase]
    AdjustRent -->|No| KeepTerms[Keep Current Terms]
    KeepTerms --> AutoRenewProcess[Process Auto-Renewal]
    NotifyIncrease --> TenantAccepts1{Tenant Accepts?}
    TenantAccepts1 -->|Yes| AutoRenewProcess
    TenantAccepts1 -->|No| ManualRenewal
    
    CheckAutoRenew -->|No| ManualRenewal[Manual Renewal Process]
    ManualRenewal --> LandlordDecision{Landlord Wants to Renew?}
    
    LandlordDecision -->|No| SendNonRenewal[Send Non-Renewal Notice]
    SendNonRenewal --> ScheduleMoveOut[Schedule Move-Out]
    ScheduleMoveOut --> EndLease([End Lease])
    
    LandlordDecision -->|Yes| CreateOffer[Create Renewal Offer]
    CreateOffer --> SetNewTerms[Set New Terms & Rent]
    SetNewTerms --> SendOffer[Send Offer to Tenant]
    SendOffer --> TenantResponse{Tenant Response?}
    
    TenantResponse -->|Decline| Negotiate{Negotiate?}
    Negotiate -->|Yes| RevisedOffer[Create Revised Offer]
    RevisedOffer --> SendOffer
    Negotiate -->|No| SendNonRenewal
    
    TenantResponse -->|Accept| ReviewNewTerms[Review New Terms]
    ReviewNewTerms --> GenerateNewLease[Generate New Lease Document]
    GenerateNewLease --> SignatureProcess[E-Signature Process]
    
    AutoRenewProcess --> GenerateNewLease
    
    SignatureProcess --> BothSign{Both Parties Sign?}
    BothSign -->|No| FollowUp[Follow Up on Signatures]
    FollowUp --> SignatureProcess
    
    BothSign -->|Yes| ActivateNewLease[Activate New Lease]
    ActivateNewLease --> UpdateSystem[Update System Records]
    UpdateSystem --> NotifyParties[Notify All Parties]
    NotifyParties --> SetNewSchedule[Set New Payment Schedule]
    SetNewSchedule --> Success([Lease Renewed])
```

---

## 3. Architecture Diagrams

### 3.1 System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Application<br/>React + TypeScript]
        Mobile[Mobile App<br/>React Native]
    end
    
    subgraph "API Layer"
        Gateway[API Gateway<br/>Vercel Edge]
        Auth[Authentication<br/>Supabase Auth]
    end
    
    subgraph "Application Layer"
        API[REST API<br/>Supabase Functions]
        RealTime[Real-Time<br/>WebSocket]
        Jobs[Background Jobs<br/>Cron Functions]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Supabase)]
        Cache[(Redis Cache<br/>Upstash)]
        Storage[File Storage<br/>Supabase Storage]
    end
    
    subgraph "External Services"
        Stripe[Payment<br/>Stripe]
        Email[Email<br/>SendGrid]
        SMS[SMS<br/>Twilio]
        DocSign[E-Signature<br/>DocuSign]
    end
    
    Web --> Gateway
    Mobile --> Gateway
    Gateway --> Auth
    Gateway --> API
    Gateway --> RealTime
    
    API --> DB
    API --> Cache
    API --> Storage
    Jobs --> DB
    RealTime --> DB
    
    API --> Stripe
    API --> Email
    API --> SMS
    API --> DocSign
    
    style Web fill:#e1f5ff
    style Mobile fill:#e1f5ff
    style DB fill:#ffe1e1
    style Cache fill:#ffe1e1
    style Storage fill:#ffe1e1
```

### 3.2 Database Schema Overview

```mermaid
erDiagram
    USERS ||--o{ PROPERTIES : owns
    USERS ||--o{ LEASES : "landlord of"
    USERS ||--o{ LEASES : "tenant of"
    PROPERTIES ||--o{ LEASES : "has"
    LEASES ||--o{ PAYMENTS : "generates"
    LEASES ||--o{ DOCUMENTS : "contains"
    PROPERTIES ||--o{ MAINTENANCE_REQUESTS : "has"
    LEASES ||--o{ MAINTENANCE_REQUESTS : "relates to"
    USERS ||--o{ MESSAGES : sends
    USERS ||--o{ MESSAGES : receives
    USERS ||--o{ NOTIFICATIONS : receives
    LEASES ||--o{ SIGNATURE_REQUESTS : requires
    
    USERS {
        uuid id PK
        string email
        string role
        string first_name
        string last_name
        timestamp created_at
    }
    
    PROPERTIES {
        uuid id PK
        uuid landlord_id FK
        string address
        string property_type
        int bedrooms
        decimal square_feet
        string status
        timestamp created_at
    }
    
    LEASES {
        uuid id PK
        uuid landlord_id FK
        uuid property_id FK
        uuid tenant_id FK
        decimal monthly_rent
        date start_date
        date end_date
        string status
        timestamp created_at
    }
    
    PAYMENTS {
        uuid id PK
        uuid lease_id FK
        uuid tenant_id FK
        decimal amount
        date due_date
        timestamp payment_date
        string status
    }
    
    MAINTENANCE_REQUESTS {
        uuid id PK
        uuid property_id FK
        uuid tenant_id FK
        string title
        string category
        string priority
        string status
        timestamp created_at
    }
    
    DOCUMENTS {
        uuid id PK
        uuid lease_id FK
        string document_type
        string file_path
        timestamp uploaded_at
    }
    
    MESSAGES {
        uuid id PK
        uuid sender_id FK
        uuid recipient_id FK
        text body
        boolean is_read
        timestamp created_at
    }
    
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string type
        string message
        boolean is_read
        timestamp created_at
    }
    
    SIGNATURE_REQUESTS {
        uuid id PK
        uuid lease_id FK
        string status
        timestamp expires_at
        timestamp completed_at
    }
```

### 3.3 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant WebApp
    participant Auth as Supabase Auth
    participant DB as Database
    participant API
    
    User->>WebApp: Enter credentials
    WebApp->>Auth: signIn(email, password)
    Auth->>Auth: Validate credentials
    Auth->>DB: Check user exists
    DB-->>Auth: User data
    Auth->>Auth: Generate JWT token
    Auth-->>WebApp: Return token + user
    WebApp->>WebApp: Store token in localStorage
    WebApp->>API: Request with Bearer token
    API->>Auth: Verify token
    Auth-->>API: Token valid + user ID
    API->>DB: Query with user context
    DB-->>API: User-specific data (RLS applied)
    API-->>WebApp: Protected data
    WebApp-->>User: Display dashboard
```

### 3.4 Payment Processing Flow

```mermaid
sequenceDiagram
    participant Tenant
    participant App
    participant API
    participant Stripe
    participant DB
    participant Landlord
    
    Tenant->>App: Initiate payment
    App->>API: Create payment intent
    API->>Stripe: Create payment intent
    Stripe-->>API: Payment intent ID
    API->>DB: Create payment record (pending)
    API-->>App: Return client secret
    
    App->>Stripe: Confirm payment (client-side)
    Stripe->>Stripe: Process payment
    Stripe-->>App: Payment success
    
    Stripe->>API: Webhook: payment_intent.succeeded
    API->>DB: Update payment (completed)
    API->>DB: Update lease balance
    API->>DB: Create transaction record
    
    API->>Landlord: Send notification (payment received)
    API->>Tenant: Send receipt
    
    API-->>Stripe: Acknowledge webhook
```

### 3.5 Real-Time Notification Flow

```mermaid
sequenceDiagram
    participant User1 as Landlord
    participant App1 as Landlord App
    participant Server as WebSocket Server
    participant DB as Database
    participant App2 as Tenant App
    participant User2 as Tenant
    
    App1->>Server: Connect WebSocket
    App2->>Server: Connect WebSocket
    Server->>Server: Store connections
    
    User1->>App1: Send message to tenant
    App1->>Server: POST /messages
    Server->>DB: Insert message
    DB-->>Server: Message created
    
    Server->>DB: Create notification
    DB-->>Server: Notification created
    
    Server->>App2: Push notification (WebSocket)
    App2->>App2: Display notification
    App2-->>User2: Show message alert
    
    Server->>App1: Confirm sent
    App1-->>User1: Message sent confirmation
    
    Note over Server,App2: Real-time delivery<br/>No polling required
```

---

## 4. Feature Screenshots Guide

### 4.1 Screenshot Requirements

**Technical Specifications:**
- Resolution: 1920x1080 (desktop), 375x812 (mobile)
- Format: PNG with transparency where applicable
- File size: < 500KB per image (optimized)
- Naming convention: `feature-name-view-type.png`
- Location: `/workspace/shadcn-ui/docs/images/screenshots/`

**Screenshot Categories:**

1. **Dashboard Views** (10 screenshots)
   - Landlord dashboard overview
   - Tenant dashboard overview
   - Property manager dashboard
   - Agent dashboard
   - Analytics dashboard
   - Financial dashboard
   - Maintenance dashboard
   - Notifications center
   - Settings page
   - Mobile dashboard view

2. **Property Management** (8 screenshots)
   - Property list view
   - Property detail page
   - Add property wizard (steps 1-3)
   - Property edit form
   - Property photos gallery
   - Property status management
   - Property search and filters

3. **Lease Management** (10 screenshots)
   - Lease list view
   - Lease detail page
   - Create lease wizard (steps 1-4)
   - Lease terms editor
   - E-signature interface
   - Lease renewal flow
   - Lease termination process
   - Lease timeline view
   - Lease document viewer

4. **Payment Processing** (6 screenshots)
   - Payment dashboard
   - Make payment form
   - Payment history
   - Payment receipt
   - Autopay setup
   - Late payment notice

5. **Maintenance Requests** (6 screenshots)
   - Maintenance request list
   - Create request form
   - Request detail page
   - Vendor assignment
   - Work in progress view
   - Completed request with photos

6. **Communication** (5 screenshots)
   - Message inbox
   - Conversation thread
   - Compose message
   - Notification settings
   - Email templates

7. **Documents** (4 screenshots)
   - Document library
   - Document upload
   - Document viewer
   - Document sharing

8. **Reports & Analytics** (5 screenshots)
   - Financial reports
   - Occupancy reports
   - Maintenance analytics
   - Custom report builder
   - Export options

### 4.2 Screenshot Capture Process

**Step 1: Prepare Environment**
```bash
# Set up test data
npm run seed:demo-data

# Start application
npm run dev

# Open browser in specific size
# Chrome DevTools > Toggle Device Toolbar > Responsive
```

**Step 2: Capture Screenshots**
```bash
# Use browser screenshot tool or
# Install screenshot extension

# For consistent captures:
# 1. Clear browser cache
# 2. Use incognito mode
# 3. Disable browser extensions
# 4. Use consistent zoom level (100%)
```

**Step 3: Optimize Images**
```bash
# Install image optimization tool
npm install -g sharp-cli

# Optimize all screenshots
sharp -i screenshots/*.png -o optimized/ --format png --quality 90
```

**Step 4: Add to Documentation**
```markdown
# In documentation files:

![Dashboard Overview](/docs/images/screenshots/landlord-dashboard-overview.png)
*Figure 1: Landlord Dashboard showing property overview, recent activity, and quick actions*
```

### 4.3 Screenshot Annotations

**Annotation Guidelines:**
- Use red arrows for important UI elements
- Add numbered callouts for step-by-step guides
- Highlight key features with colored boxes
- Add text labels for clarity
- Keep annotations minimal and clear

**Tools for Annotation:**
- Figma (recommended)
- Adobe Photoshop
- Snagit
- Skitch
- CloudApp

---

## 5. UI Component Diagrams

### 5.1 Dashboard Layout Structure

```mermaid
graph TD
    subgraph "Dashboard Layout"
        Header[Header Navigation]
        Sidebar[Sidebar Menu]
        Main[Main Content Area]
        Footer[Footer]
    end
    
    subgraph "Header Components"
        Logo[Logo]
        Search[Global Search]
        Notifications[Notifications Bell]
        Profile[User Profile Menu]
    end
    
    subgraph "Sidebar Components"
        Nav1[Dashboard]
        Nav2[Properties]
        Nav3[Leases]
        Nav4[Payments]
        Nav5[Maintenance]
        Nav6[Messages]
        Nav7[Reports]
        Nav8[Settings]
    end
    
    subgraph "Main Content"
        Breadcrumb[Breadcrumb]
        PageTitle[Page Title]
        Actions[Action Buttons]
        Content[Dynamic Content]
        Pagination[Pagination]
    end
    
    Header --> Logo
    Header --> Search
    Header --> Notifications
    Header --> Profile
    
    Sidebar --> Nav1
    Sidebar --> Nav2
    Sidebar --> Nav3
    Sidebar --> Nav4
    Sidebar --> Nav5
    Sidebar --> Nav6
    Sidebar --> Nav7
    Sidebar --> Nav8
    
    Main --> Breadcrumb
    Main --> PageTitle
    Main --> Actions
    Main --> Content
    Main --> Pagination
```

### 5.2 Property Card Component

```mermaid
graph LR
    subgraph "Property Card"
        Image[Property Image]
        Badge[Status Badge]
        Title[Property Address]
        Details[Property Details]
        Stats[Quick Stats]
        Actions[Action Buttons]
    end
    
    Details --> Beds[Bedrooms: 3]
    Details --> Baths[Bathrooms: 2]
    Details --> SqFt[1,200 sq ft]
    
    Stats --> Rent[Rent: $2,500/mo]
    Stats --> Occupancy[Occupancy: 100%]
    Stats --> Status[Status: Occupied]
    
    Actions --> View[View Details]
    Actions --> Edit[Edit]
    Actions --> More[More Options]
```

### 5.3 Lease Wizard Steps

```mermaid
graph LR
    Step1[Step 1:<br/>Property Selection] --> Step2[Step 2:<br/>Tenant Information]
    Step2 --> Step3[Step 3:<br/>Lease Terms]
    Step3 --> Step4[Step 4:<br/>Policies & Rules]
    Step4 --> Step5[Step 5:<br/>Review & Sign]
    
    style Step1 fill:#e3f2fd
    style Step2 fill:#e3f2fd
    style Step3 fill:#e3f2fd
    style Step4 fill:#e3f2fd
    style Step5 fill:#c8e6c9
```

---

## 6. Data Flow Diagrams

### 6.1 Lease Creation Data Flow

```mermaid
flowchart LR
    User[User Input] --> Validation[Client-Side Validation]
    Validation --> API[API Request]
    API --> Auth[Authentication Check]
    Auth --> RLS[Row-Level Security]
    RLS --> Transaction[Database Transaction]
    
    Transaction --> CreateLease[Create Lease Record]
    CreateLease --> CreateSchedule[Create Payment Schedule]
    CreateSchedule --> UpdateProperty[Update Property Status]
    UpdateProperty --> CreateNotification[Create Notifications]
    CreateNotification --> SendEmail[Send Email Notifications]
    
    SendEmail --> Response[API Response]
    Response --> UI[Update UI]
    UI --> Success[Success Message]
```

### 6.2 Payment Processing Data Flow

```mermaid
flowchart TD
    Tenant[Tenant Initiates Payment] --> Form[Payment Form]
    Form --> Validate[Validate Amount & Method]
    Validate --> API[API: Create Payment Intent]
    
    API --> Stripe[Stripe API]
    Stripe --> Process[Process Payment]
    Process --> Result{Success?}
    
    Result -->|Yes| Webhook[Stripe Webhook]
    Result -->|No| Error[Error Handler]
    Error --> Retry[Retry Logic]
    Retry --> Stripe
    
    Webhook --> UpdateDB[Update Database]
    UpdateDB --> CreateReceipt[Generate Receipt]
    CreateReceipt --> SendReceipt[Send Receipt Email]
    SendReceipt --> NotifyLandlord[Notify Landlord]
    NotifyLandlord --> UpdateLedger[Update Financial Ledger]
    UpdateLedger --> Complete[Payment Complete]
```

### 6.3 Real-Time Notification Data Flow

```mermaid
flowchart LR
    Event[System Event] --> Trigger[Notification Trigger]
    Trigger --> Create[Create Notification Record]
    Create --> DB[(Database)]
    
    DB --> Channels{Delivery Channels}
    
    Channels -->|In-App| WebSocket[WebSocket Push]
    Channels -->|Email| EmailQueue[Email Queue]
    Channels -->|SMS| SMSQueue[SMS Queue]
    
    WebSocket --> Client1[Connected Clients]
    EmailQueue --> SendGrid[SendGrid API]
    SMSQueue --> Twilio[Twilio API]
    
    Client1 --> Display[Display Notification]
    SendGrid --> EmailSent[Email Sent]
    Twilio --> SMSSent[SMS Sent]
    
    Display --> MarkRead[Mark as Read]
    EmailSent --> UpdateStatus[Update Delivery Status]
    SMSSent --> UpdateStatus
    UpdateStatus --> DB
```

---

## 7. Integration with Existing Documentation

### 7.1 User Guide Enhancements

**File: `/workspace/shadcn-ui/docs/user-guide/landlord-guide.md`**

Add visual elements to these sections:

1. **Dashboard Overview** (Line 50)
   - Add: Dashboard screenshot with annotations
   - Add: Quick stats explanation diagram
   - Add: Navigation flow diagram

2. **Property Management** (Line 150)
   - Add: Property list screenshot
   - Add: Add property wizard screenshots (3 steps)
   - Add: Property detail page screenshot

3. **Lease Management** (Line 350)
   - Add: Lease creation workflow diagram
   - Add: E-signature process screenshots
   - Add: Lease timeline visualization

4. **Payment Processing** (Line 550)
   - Add: Payment dashboard screenshot
   - Add: Payment processing flow diagram
   - Add: Receipt example

5. **Maintenance Requests** (Line 750)
   - Add: Maintenance workflow diagram
   - Add: Request form screenshot
   - Add: Status tracking visualization

**File: `/workspace/shadcn-ui/docs/user-guide/tenant-guide.md`**

Add visual elements to these sections:

1. **Getting Started** (Line 40)
   - Add: Tenant onboarding journey diagram
   - Add: Dashboard screenshot
   - Add: Mobile app screenshots

2. **Making Payments** (Line 200)
   - Add: Payment form screenshot
   - Add: Autopay setup guide with screenshots
   - Add: Payment history view

3. **Maintenance Requests** (Line 350)
   - Add: Request submission flow diagram
   - Add: Form screenshots
   - Add: Status tracking example

### 7.2 Technical Documentation Enhancements

**File: `/workspace/shadcn-ui/docs/database_schema_design.md`**

Add visual elements:

1. **Entity Relationship Diagram** (Line 50)
   - ✅ Already included (Mermaid ERD)
   - Enhance with color coding by module

2. **Data Flow Diagrams** (Add new section)
   - Add: Lease creation data flow
   - Add: Payment processing data flow
   - Add: Authentication flow

**File: `/workspace/shadcn-ui/docs/architecture/state_management_architecture.md`**

Add visual elements:

1. **State Management Flow** (Line 100)
   - Add: React Query data flow diagram
   - Add: Zustand store structure diagram
   - Add: Context API usage diagram

### 7.3 Performance Documentation Enhancements

**File: `/workspace/shadcn-ui/docs/performance-reports/FINAL_PERFORMANCE_SUMMARY.md`**

Add visual elements:

1. **Performance Metrics** (Line 50)
   - Add: Performance comparison chart
   - Add: Load time visualization
   - Add: Cache hit rate diagram

2. **Architecture Diagram** (Line 200)
   - Add: System architecture overview
   - Add: Caching layers diagram
   - Add: Database optimization visualization

---

## 8. Screenshot Checklist

### Priority 1: Essential Screenshots (Due: Week 1)

- [ ] Landlord dashboard overview
- [ ] Tenant dashboard overview
- [ ] Property list view
- [ ] Property detail page
- [ ] Create lease wizard (all steps)
- [ ] Payment form
- [ ] Maintenance request form
- [ ] Message inbox
- [ ] Mobile dashboard view

### Priority 2: Feature Screenshots (Due: Week 2)

- [ ] Property manager dashboard
- [ ] Agent dashboard
- [ ] Analytics dashboard
- [ ] Financial reports
- [ ] Lease timeline
- [ ] E-signature interface
- [ ] Document library
- [ ] Settings page
- [ ] Notification center

### Priority 3: Advanced Screenshots (Due: Week 3)

- [ ] Custom report builder
- [ ] Vendor management
- [ ] Team collaboration
- [ ] Advanced search
- [ ] Bulk operations
- [ ] API documentation
- [ ] Integration settings
- [ ] White-label options

---

## 9. Diagram Creation Tools

**Recommended Tools:**

1. **Mermaid** (Primary - Already used in docs)
   - Pros: Text-based, version control friendly, renders in markdown
   - Cons: Limited styling options
   - Use for: Flowcharts, sequence diagrams, ERDs

2. **Figma** (For complex designs)
   - Pros: Professional quality, collaboration features
   - Cons: Requires design skills
   - Use for: UI mockups, detailed wireframes, annotations

3. **Excalidraw** (For quick sketches)
   - Pros: Hand-drawn style, easy to use
   - Cons: Less professional appearance
   - Use for: Brainstorming, rough concepts

4. **Draw.io / Diagrams.net** (For technical diagrams)
   - Pros: Free, comprehensive shapes library
   - Cons: Can be complex for simple diagrams
   - Use for: Architecture diagrams, network diagrams

---

## 10. Implementation Timeline

**Week 1: Core Visuals**
- Day 1-2: Create all workflow diagrams (Mermaid)
- Day 3-4: Capture essential screenshots (Priority 1)
- Day 5: Add visuals to landlord guide

**Week 2: Extended Visuals**
- Day 1-2: Create architecture diagrams
- Day 3-4: Capture feature screenshots (Priority 2)
- Day 5: Add visuals to tenant guide and technical docs

**Week 3: Advanced Visuals**
- Day 1-2: Create data flow diagrams
- Day 3-4: Capture advanced screenshots (Priority 3)
- Day 5: Final review and optimization

---

## 11. Quality Standards

**All Visuals Must:**
- Be clear and easy to understand
- Use consistent styling and colors
- Include descriptive captions
- Be optimized for web (< 500KB)
- Work in both light and dark modes
- Be accessible (alt text, high contrast)

**Color Palette:**
- Primary: #3B82F6 (Blue)
- Success: #10B981 (Green)
- Warning: #F59E0B (Orange)
- Error: #EF4444 (Red)
- Neutral: #6B7280 (Gray)

**Typography:**
- Headings: Inter, 16-24px, Bold
- Body: Inter, 14px, Regular
- Code: Fira Code, 12px, Monospace

---

**Document Status:** Complete  
**Next Steps:** Begin screenshot capture and diagram creation  
**Owner:** Emma (Product Manager)  
**Review Date:** After Week 1 completion

---

**End of Visual Documentation Guide**