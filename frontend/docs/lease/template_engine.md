# Lease Template Engine Documentation

## Overview

The Lease Template Engine is a comprehensive system for managing, validating, and generating lease agreements with state-specific legal compliance, dynamic field population, and version control.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Features](#core-features)
3. [API Reference](#api-reference)
4. [Template Structure](#template-structure)
5. [State-Specific Rules](#state-specific-rules)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)

---

## Architecture

### System Components

```
LeaseTemplateEngine
├── Template Management
│   ├── CRUD Operations
│   ├── Categorization
│   ├── Activation/Deactivation
│   └── Search & Filtering
├── Version Control
│   ├── Version History
│   ├── Change Tracking
│   └── Rollback Capability
├── State Compliance
│   ├── Legal Requirements Database
│   ├── Mandatory Clauses
│   ├── Prohibited Clauses
│   └── Validation Rules
├── Dynamic Population
│   ├── Property Data Integration
│   ├── Tenant Data Integration
│   ├── Financial Calculations
│   └── Automatic Field Mapping
└── Validation System
    ├── Template Validation
    ├── Lease Validation
    ├── Compliance Checking
    └── Error Reporting
```

### Data Flow

```
1. Template Creation
   ↓
2. Version Control
   ↓
3. Data Population (Property, Tenant, Financial)
   ↓
4. State-Specific Clause Injection
   ↓
5. Validation & Compliance Check
   ↓
6. Lease Agreement Generation
```

---

## Core Features

### 1. Template Management System

#### CRUD Operations
- **Create**: Generate new templates with custom clauses
- **Read**: Retrieve templates by ID or filter criteria
- **Update**: Modify existing templates with version tracking
- **Delete**: Soft delete by deactivation

#### Template Categorization
- **Residential**: Standard apartments, houses, condos
- **Commercial**: Retail, office, industrial spaces
- **Short-Term**: Vacation rentals, temporary stays
- **Month-to-Month**: Flexible rental agreements
- **Renewal**: Lease renewal templates

#### Features
- Active/inactive status management
- Default template designation
- Tag-based organization
- Multi-state applicability

### 2. State-Specific Legal Requirements

#### Supported States
Currently includes comprehensive requirements for:
- **California (CA)**: 2x/3x deposit limits, 24-hour entry notice, 21-day return
- **New York (NY)**: 1x deposit limit, interest required, 14-day return
- **Texas (TX)**: No deposit limit, 24-hour entry notice, 30-day return
- **Florida (FL)**: No deposit limit, 12-hour entry notice, 15-day return

#### Legal Requirement Components

**Security Deposit Limits**
```typescript
{
  unfurnished: number;      // Multiple of monthly rent
  furnished: number;        // Multiple of monthly rent
  interestRequired: boolean; // Must pay interest on deposit
  returnPeriodDays: number; // Days to return after move-out
}
```

**Notice Periods**
```typescript
{
  landlordEntry: number;      // Hours notice for entry
  leaseTermination: number;   // Days notice to terminate
  rentIncrease: number;       // Days notice for rent increase
}
```

**Mandatory Clauses**
- Lead-based paint disclosure (federal, pre-1978 properties)
- Security deposit terms (state-specific)
- Entry and inspection rights (state-specific)
- Habitability warranty (varies by state)

**Prohibited Clauses**
- Waiver of repair rights (CA)
- Unlimited late fees (CA)
- Waiver of jury trial (NY)
- Confession of judgment (NY)

**Disclosure Requirements**
- Lead-based paint (federal)
- Mold information (CA)
- Bed bug history (CA, NY)
- Window guards (NY)
- Flooding history (TX)

**Late Fee Restrictions**
```typescript
{
  maxPercentage?: number;   // Max % of monthly rent
  gracePeriodDays: number;  // Days before late fee applies
}
```

### 3. Dynamic Field Population

#### Field Types
- **Text**: Names, addresses, descriptions
- **Number**: Quantities, counts
- **Currency**: Rent, deposits, fees
- **Date**: Start date, end date, due dates
- **Boolean**: Yes/no flags
- **Calculated**: Auto-computed values

#### Data Sources
- **Property**: Address, type, amenities, specifications
- **Tenant**: Name, contact, employment, income
- **Landlord**: Name, contact, company, license
- **Financial**: Rent, deposits, fees, due dates
- **Calculated**: Prorated rent, total costs, durations

#### Automatic Calculations

**Prorated Rent**
```typescript
prorated_rent = (monthly_rent / days_in_month) * days_remaining
```

**Total Move-In Cost**
```typescript
total_move_in_cost = monthly_rent + security_deposit + pet_deposit + application_fee
```

**Lease Duration**
```typescript
duration_months = (end_date - start_date) / (30 * 24 * 60 * 60 * 1000)
```

### 4. Template Versioning

#### Version Tracking
- Automatic version numbering
- Change description required
- Creator attribution
- Timestamp tracking
- Active/inactive status

#### Version History
```typescript
interface TemplateVersion {
  versionId: string;
  templateId: string;
  versionNumber: number;
  createdAt: Date;
  createdBy: string;
  changes: string;
  template: LeaseTemplate;
  isActive: boolean;
}
```

#### Rollback Capability
- Restore any previous version
- Maintains version history
- Creates new version on rollback
- Preserves audit trail

### 5. Validation System

#### Template Validation
- Required field checking
- Clause completeness
- State compliance verification
- Prohibited clause detection
- Compliance score calculation

#### Lease Validation
- Required data presence
- Date range validation
- Financial amount validation
- Security deposit limit checking
- Mandatory clause verification

#### Validation Results
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];      // Critical issues
  warnings: ValidationWarning[];  // Recommendations
  complianceScore: number;        // 0-100 score
}
```

---

## API Reference

### Template Management

#### `createTemplate(template)`
Create a new lease template.

**Parameters:**
```typescript
template: Omit<LeaseTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt'>
```

**Returns:**
```typescript
Promise<LeaseTemplate>
```

**Example:**
```typescript
const template = await engine.createTemplate({
  name: 'Custom Residential Lease',
  description: 'Customized lease for luxury apartments',
  category: 'residential',
  leaseType: 'fixed-term',
  isActive: true,
  isDefault: false,
  createdBy: 'user_123',
  clauses: [...],
  requiredFields: ['property_address', 'tenant_full_name'],
  stateSpecific: true,
  applicableStates: ['CA', 'NY'],
  tags: ['luxury', 'high-rise']
});
```

#### `getTemplate(templateId)`
Retrieve a template by ID.

**Parameters:**
```typescript
templateId: string
```

**Returns:**
```typescript
Promise<LeaseTemplate | null>
```

**Example:**
```typescript
const template = await engine.getTemplate('template_residential_standard');
```

#### `getAllTemplates(filters?)`
Get all templates with optional filtering.

**Parameters:**
```typescript
filters?: {
  category?: TemplateCategory;
  leaseType?: LeaseType;
  isActive?: boolean;
  stateCode?: string;
  tags?: string[];
}
```

**Returns:**
```typescript
Promise<LeaseTemplate[]>
```

**Example:**
```typescript
// Get all active residential templates for California
const templates = await engine.getAllTemplates({
  category: 'residential',
  isActive: true,
  stateCode: 'CA'
});

// Get templates with specific tags
const luxuryTemplates = await engine.getAllTemplates({
  tags: ['luxury', 'high-end']
});
```

#### `updateTemplate(templateId, updates, changeDescription)`
Update an existing template.

**Parameters:**
```typescript
templateId: string
updates: Partial<LeaseTemplate>
changeDescription: string
```

**Returns:**
```typescript
Promise<LeaseTemplate>
```

**Example:**
```typescript
const updated = await engine.updateTemplate(
  'template_residential_standard',
  {
    name: 'Updated Standard Residential Lease',
    clauses: [...newClauses]
  },
  'Added pet policy clause and updated security deposit terms'
);
```

#### `deleteTemplate(templateId)`
Soft delete a template by deactivating it.

**Parameters:**
```typescript
templateId: string
```

**Returns:**
```typescript
Promise<boolean>
```

**Example:**
```typescript
await engine.deleteTemplate('template_old_version');
```

#### `activateTemplate(templateId)`
Activate a template.

**Parameters:**
```typescript
templateId: string
```

**Returns:**
```typescript
Promise<LeaseTemplate>
```

#### `deactivateTemplate(templateId)`
Deactivate a template.

**Parameters:**
```typescript
templateId: string
```

**Returns:**
```typescript
Promise<LeaseTemplate>
```

### Version Management

#### `getTemplateVersions(templateId)`
Get all versions of a template.

**Parameters:**
```typescript
templateId: string
```

**Returns:**
```typescript
Promise<TemplateVersion[]>
```

**Example:**
```typescript
const versions = await engine.getTemplateVersions('template_residential_standard');
console.log(`Template has ${versions.length} versions`);
```

#### `getTemplateVersion(templateId, versionNumber)`
Get a specific version of a template.

**Parameters:**
```typescript
templateId: string
versionNumber: number
```

**Returns:**
```typescript
Promise<TemplateVersion | null>
```

**Example:**
```typescript
const version = await engine.getTemplateVersion('template_residential_standard', 3);
```

#### `rollbackTemplate(templateId, versionNumber)`
Rollback template to a previous version.

**Parameters:**
```typescript
templateId: string
versionNumber: number
```

**Returns:**
```typescript
Promise<LeaseTemplate>
```

**Example:**
```typescript
// Rollback to version 2
const rolledBack = await engine.rollbackTemplate('template_residential_standard', 2);
```

### State-Specific Requirements

#### `getStateRequirements(stateCode)`
Get legal requirements for a state.

**Parameters:**
```typescript
stateCode: string  // Two-letter state code
```

**Returns:**
```typescript
StateLegalRequirement | null
```

**Example:**
```typescript
const caRequirements = engine.getStateRequirements('CA');
console.log(`CA security deposit limit: ${caRequirements.requirements.securityDepositLimit.unfurnished}x rent`);
```

#### `getMandatoryClauses(stateCode)`
Get mandatory clause IDs for a state.

**Parameters:**
```typescript
stateCode: string
```

**Returns:**
```typescript
string[]
```

**Example:**
```typescript
const mandatory = engine.getMandatoryClauses('NY');
console.log('NY requires these clauses:', mandatory);
```

#### `isClauseProhibited(stateCode, clauseId)`
Check if a clause is prohibited in a state.

**Parameters:**
```typescript
stateCode: string
clauseId: string
```

**Returns:**
```typescript
boolean
```

**Example:**
```typescript
if (engine.isClauseProhibited('CA', 'waiver_of_repair_rights')) {
  console.log('This clause cannot be used in California');
}
```

#### `validateSecurityDeposit(stateCode, depositAmount, monthlyRent, isFurnished)`
Validate security deposit against state limits.

**Parameters:**
```typescript
stateCode: string
depositAmount: number
monthlyRent: number
isFurnished: boolean
```

**Returns:**
```typescript
{
  isValid: boolean;
  maxAllowed: number;
  message?: string;
}
```

**Example:**
```typescript
const validation = engine.validateSecurityDeposit('CA', 5000, 2000, false);
if (!validation.isValid) {
  console.error(validation.message);
  console.log(`Maximum allowed: $${validation.maxAllowed}`);
}
```

### Dynamic Population

#### `populateTemplate(templateId, data)`
Populate a template with dynamic data.

**Parameters:**
```typescript
templateId: string
data: {
  property: PropertyData;
  tenant: TenantData;
  landlord: LandlordData;
  financial: FinancialTerms;
}
```

**Returns:**
```typescript
Promise<Partial<LeaseAgreement>>
```

**Example:**
```typescript
const lease = await engine.populateTemplate('template_residential_standard', {
  property: {
    id: 'prop_123',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    amenities: ['Parking', 'Pool', 'Gym'],
    yearBuilt: 1975,
    furnished: false
  },
  tenant: {
    id: 'tenant_456',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0123',
    employmentStatus: 'Employed',
    employer: 'Tech Corp',
    annualIncome: 80000
  },
  landlord: {
    id: 'landlord_789',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '555-0456',
    companyName: 'Smith Properties LLC',
    address: '456 Oak Ave'
  },
  financial: {
    monthlyRent: 2000,
    securityDeposit: 4000,
    rentDueDay: 1,
    lateFeeAmount: 100,
    lateFeeGraceDays: 3,
    prorationRequired: true,
    moveInDate: new Date('2024-01-15')
  }
});
```

### Validation

#### `validateTemplate(template)`
Validate a template for completeness and compliance.

**Parameters:**
```typescript
template: LeaseTemplate
```

**Returns:**
```typescript
Promise<ValidationResult>
```

**Example:**
```typescript
const validation = await engine.validateTemplate(template);

if (!validation.isValid) {
  console.error('Template validation failed:');
  validation.errors.forEach(error => {
    console.error(`- ${error.message}`);
  });
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:');
  validation.warnings.forEach(warning => {
    console.warn(`- ${warning.message}`);
  });
}

console.log(`Compliance Score: ${validation.complianceScore}%`);
```

#### `validateLease(lease, stateCode)`
Validate a populated lease agreement.

**Parameters:**
```typescript
lease: Partial<LeaseAgreement>
stateCode: string
```

**Returns:**
```typescript
Promise<ValidationResult>
```

**Example:**
```typescript
const validation = await engine.validateLease(lease, 'CA');

if (validation.isValid) {
  console.log('Lease is ready for signing!');
} else {
  console.error('Lease has validation errors:');
  validation.errors.forEach(error => {
    console.error(`- [${error.severity}] ${error.message}`);
    if (error.suggestion) {
      console.log(`  Suggestion: ${error.suggestion}`);
    }
  });
}
```

---

## Template Structure

### LeaseTemplate Interface

```typescript
interface LeaseTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  leaseType: LeaseType;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  clauses: LeaseClause[];
  requiredFields: string[];
  stateSpecific: boolean;
  applicableStates?: string[];
  tags?: string[];
}
```

### LeaseClause Structure

```typescript
interface LeaseClause {
  id: string;
  title: string;
  content: string;
  category: ClauseCategory;
  order: number;
  isMandatory: boolean;
  isStateSpecific: boolean;
  applicableStates?: string[];
  isCustom: boolean;
  isEditable: boolean;
  variables?: ClauseVariable[];
  tags?: string[];
  lastUpdated: Date;
}
```

### Example Template

```typescript
const residentialTemplate: LeaseTemplate = {
  id: 'template_residential_standard',
  name: 'Standard Residential Lease',
  description: 'Comprehensive residential lease for apartments and houses',
  category: 'residential',
  leaseType: 'fixed-term',
  isActive: true,
  isDefault: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  clauses: [
    {
      id: 'rent_payment',
      title: 'Rent Payment Terms',
      content: 'Tenant agrees to pay monthly rent of $[monthly_rent] on the [rent_due_day] day of each month...',
      category: 'rent-payment',
      order: 1,
      isMandatory: true,
      isStateSpecific: false,
      isCustom: false,
      isEditable: true,
      variables: [
        {
          name: 'monthly_rent',
          type: 'currency',
          value: 0,
          required: true
        },
        {
          name: 'rent_due_day',
          type: 'number',
          value: 1,
          required: true
        }
      ],
      tags: ['financial', 'payment'],
      lastUpdated: new Date()
    }
  ],
  requiredFields: [
    'property_address',
    'tenant_full_name',
    'landlord_full_name',
    'monthly_rent',
    'security_deposit',
    'lease_start_date',
    'lease_end_date'
  ],
  stateSpecific: false,
  applicableStates: ['ALL'],
  tags: ['residential', 'standard', 'long-term']
};
```

---

## State-Specific Rules

### Rule Application Process

1. **Property Location Detection**
   - Extract state code from property address
   - Load state-specific requirements

2. **Mandatory Clause Injection**
   - Check for required clauses
   - Auto-add missing mandatory clauses
   - Customize clause content for state

3. **Prohibited Clause Removal**
   - Scan template for prohibited clauses
   - Flag or remove prohibited content
   - Suggest alternative clauses

4. **Validation**
   - Verify all mandatory clauses present
   - Check no prohibited clauses included
   - Validate financial terms against limits
   - Verify notice periods comply with law

### State Rule Examples

#### California Security Deposit

```typescript
// CA limits deposit to 2x rent (unfurnished) or 3x rent (furnished)
const caRules = engine.getStateRequirements('CA');
const maxDeposit = monthlyRent * (isFurnished ? 3 : 2);

if (securityDeposit > maxDeposit) {
  throw new Error(`CA deposit limit exceeded. Max: $${maxDeposit}`);
}
```

#### New York Interest Requirement

```typescript
// NY requires interest on deposits for buildings with 6+ units
const nyRules = engine.getStateRequirements('NY');
if (nyRules.requirements.securityDepositLimit.interestRequired) {
  // Add interest calculation clause
  clauses.push(interestCalculationClause);
}
```

#### Texas Flooding Disclosure

```typescript
// TX requires disclosure of previous flooding
const txRules = engine.getStateRequirements('TX');
if (txRules.requirements.disclosureRequirements.includes('Previous flooding')) {
  // Add flooding disclosure clause
  clauses.push(floodingDisclosureClause);
}
```

---

## Usage Examples

### Example 1: Create Custom Template

```typescript
import { leaseTemplateEngine } from '@/services/leaseTemplateEngine';

async function createCustomTemplate() {
  const template = await leaseTemplateEngine.createTemplate({
    name: 'Luxury High-Rise Lease',
    description: 'Premium lease for luxury high-rise apartments',
    category: 'residential',
    leaseType: 'fixed-term',
    isActive: true,
    isDefault: false,
    createdBy: 'user_123',
    clauses: [
      {
        id: 'amenity_access',
        title: 'Luxury Amenity Access',
        content: 'Tenant has 24/7 access to building amenities including rooftop pool, fitness center, concierge service, and private theater...',
        category: 'special-conditions',
        order: 1,
        isMandatory: false,
        isStateSpecific: false,
        isCustom: true,
        isEditable: true,
        tags: ['luxury', 'amenities'],
        lastUpdated: new Date()
      }
    ],
    requiredFields: [
      'property_address',
      'tenant_full_name',
      'monthly_rent',
      'security_deposit'
    ],
    stateSpecific: true,
    applicableStates: ['CA', 'NY'],
    tags: ['luxury', 'high-rise', 'premium']
  });

  console.log(`Created template: ${template.id}`);
  return template;
}
```

### Example 2: Generate Lease from Template

```typescript
async function generateLease() {
  const lease = await leaseTemplateEngine.populateTemplate(
    'template_residential_standard',
    {
      property: {
        id: 'prop_123',
        address: '123 Main St, Apt 4B',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 1200,
        amenities: ['Parking', 'Pool', 'Gym', 'Laundry'],
        yearBuilt: 1975,
        furnished: false
      },
      tenant: {
        id: 'tenant_456',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0123',
        employmentStatus: 'Employed',
        employer: 'Tech Corp',
        annualIncome: 80000,
        emergencyContact: {
          name: 'Jane Doe',
          phone: '555-0456',
          relationship: 'Sister'
        }
      },
      landlord: {
        id: 'landlord_789',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '555-0789',
        companyName: 'Smith Properties LLC',
        licenseNumber: 'CA-RE-12345',
        address: '456 Oak Ave, Los Angeles, CA 90002'
      },
      financial: {
        monthlyRent: 2000,
        securityDeposit: 4000,
        petDeposit: 500,
        rentDueDay: 1,
        lateFeeAmount: 100,
        lateFeeGraceDays: 3,
        prorationRequired: true,
        moveInDate: new Date('2024-01-15')
      }
    }
  );

  // Validate the generated lease
  const validation = await leaseTemplateEngine.validateLease(lease, 'CA');
  
  if (validation.isValid) {
    console.log('Lease generated successfully!');
    console.log(`Compliance Score: ${validation.complianceScore}%`);
    return lease;
  } else {
    console.error('Lease validation failed');
    validation.errors.forEach(error => {
      console.error(`- ${error.message}`);
    });
    throw new Error('Lease validation failed');
  }
}
```

### Example 3: Update Template with Version Control

```typescript
async function updateTemplateWithVersioning() {
  const templateId = 'template_residential_standard';
  
  // Get current version
  const currentTemplate = await leaseTemplateEngine.getTemplate(templateId);
  console.log(`Current version: ${currentTemplate?.version}`);
  
  // Update template
  const updated = await leaseTemplateEngine.updateTemplate(
    templateId,
    {
      clauses: [
        ...currentTemplate!.clauses,
        {
          id: 'smart_home',
          title: 'Smart Home Technology',
          content: 'Property includes smart home features including keyless entry, smart thermostat, and security cameras...',
          category: 'special-conditions',
          order: 10,
          isMandatory: false,
          isStateSpecific: false,
          isCustom: true,
          isEditable: true,
          tags: ['technology', 'smart-home'],
          lastUpdated: new Date()
        }
      ]
    },
    'Added smart home technology clause'
  );
  
  console.log(`Updated to version: ${updated.version}`);
  
  // View version history
  const versions = await leaseTemplateEngine.getTemplateVersions(templateId);
  console.log('Version history:');
  versions.forEach(v => {
    console.log(`- v${v.versionNumber}: ${v.changes} (${v.createdAt.toLocaleDateString()})`);
  });
  
  // Rollback if needed
  if (/* something went wrong */) {
    const rolledBack = await leaseTemplateEngine.rollbackTemplate(templateId, currentTemplate!.version);
    console.log(`Rolled back to version ${rolledBack.version}`);
  }
}
```

### Example 4: State Compliance Checking

```typescript
async function checkStateCompliance() {
  const stateCode = 'CA';
  const lease = {
    propertyId: 'prop_123',
    landlordId: 'landlord_789',
    tenantId: 'tenant_456',
    rentAmount: 2000,
    securityDeposit: 5000, // Intentionally too high for CA
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    clauses: []
  };
  
  // Check security deposit
  const depositValidation = leaseTemplateEngine.validateSecurityDeposit(
    stateCode,
    lease.securityDeposit,
    lease.rentAmount,
    false
  );
  
  if (!depositValidation.isValid) {
    console.error(depositValidation.message);
    console.log(`Reducing deposit to: $${depositValidation.maxAllowed}`);
    lease.securityDeposit = depositValidation.maxAllowed;
  }
  
  // Check mandatory clauses
  const mandatoryClauses = leaseTemplateEngine.getMandatoryClauses(stateCode);
  console.log('Mandatory clauses for CA:', mandatoryClauses);
  
  // Get state requirements
  const requirements = leaseTemplateEngine.getStateRequirements(stateCode);
  console.log('CA Requirements:');
  console.log(`- Entry notice: ${requirements?.requirements.noticePeriods.landlordEntry} hours`);
  console.log(`- Deposit return: ${requirements?.requirements.securityDepositLimit.returnPeriodDays} days`);
  console.log(`- Late fee limit: ${requirements?.requirements.lateFeeRestrictions.maxPercentage}%`);
  
  // Validate complete lease
  const validation = await leaseTemplateEngine.validateLease(lease, stateCode);
  console.log(`Compliance Score: ${validation.complianceScore}%`);
  
  if (!validation.isValid) {
    console.error('Compliance issues:');
    validation.errors.forEach(error => {
      console.error(`- [${error.severity}] ${error.message}`);
      if (error.suggestion) {
        console.log(`  Fix: ${error.suggestion}`);
      }
    });
  }
}
```

### Example 5: Search and Filter Templates

```typescript
async function searchTemplates() {
  // Get all residential templates
  const residential = await leaseTemplateEngine.getAllTemplates({
    category: 'residential',
    isActive: true
  });
  console.log(`Found ${residential.length} residential templates`);
  
  // Get California-specific templates
  const caTemplates = await leaseTemplateEngine.getAllTemplates({
    stateCode: 'CA',
    isActive: true
  });
  console.log(`Found ${caTemplates.length} CA-compliant templates`);
  
  // Get luxury templates
  const luxuryTemplates = await leaseTemplateEngine.getAllTemplates({
    tags: ['luxury', 'premium'],
    isActive: true
  });
  console.log(`Found ${luxuryTemplates.length} luxury templates`);
  
  // Get short-term rental templates
  const shortTerm = await leaseTemplateEngine.getAllTemplates({
    category: 'short-term',
    leaseType: 'fixed-term',
    isActive: true
  });
  console.log(`Found ${shortTerm.length} short-term templates`);
}
```

---

## Best Practices

### 1. Template Design

**DO:**
- ✅ Use clear, descriptive template names
- ✅ Include comprehensive descriptions
- ✅ Organize clauses by category
- ✅ Use appropriate tags for searchability
- ✅ Define all required fields
- ✅ Include state-specific variations
- ✅ Provide default values for variables

**DON'T:**
- ❌ Create overly generic templates
- ❌ Mix residential and commercial clauses
- ❌ Hardcode values that should be dynamic
- ❌ Skip validation before activation
- ❌ Forget to version control changes

### 2. State Compliance

**DO:**
- ✅ Always check state requirements before generating leases
- ✅ Validate security deposits against state limits
- ✅ Include all mandatory clauses
- ✅ Remove or flag prohibited clauses
- ✅ Update templates when laws change
- ✅ Document state-specific customizations

**DON'T:**
- ❌ Assume one template works for all states
- ❌ Skip mandatory disclosures
- ❌ Use prohibited clauses
- ❌ Ignore state notice period requirements
- ❌ Forget to validate before signing

### 3. Data Population

**DO:**
- ✅ Validate all input data before population
- ✅ Use calculated fields for derived values
- ✅ Handle missing optional data gracefully
- ✅ Format currency and dates consistently
- ✅ Verify data completeness
- ✅ Sanitize user input

**DON'T:**
- ❌ Populate templates with incomplete data
- ❌ Skip validation of populated leases
- ❌ Hardcode calculated values
- ❌ Ignore data type mismatches
- ❌ Allow SQL injection or XSS vulnerabilities

### 4. Version Control

**DO:**
- ✅ Create new versions for all changes
- ✅ Provide clear change descriptions
- ✅ Test templates before activation
- ✅ Keep version history indefinitely
- ✅ Document breaking changes
- ✅ Use semantic versioning concepts

**DON'T:**
- ❌ Modify templates without versioning
- ❌ Delete version history
- ❌ Skip testing after updates
- ❌ Use vague change descriptions
- ❌ Activate untested versions

### 5. Validation

**DO:**
- ✅ Validate templates before saving
- ✅ Validate leases before signing
- ✅ Check compliance scores
- ✅ Address all critical errors
- ✅ Review warnings carefully
- ✅ Re-validate after changes

**DON'T:**
- ❌ Skip validation steps
- ❌ Ignore validation warnings
- ❌ Proceed with failed validation
- ❌ Override compliance checks
- ❌ Disable validation in production

### 6. Error Handling

**DO:**
- ✅ Provide clear error messages
- ✅ Include suggestions for fixes
- ✅ Log validation failures
- ✅ Handle async errors properly
- ✅ Implement retry logic where appropriate
- ✅ Notify users of issues

**DON'T:**
- ❌ Swallow errors silently
- ❌ Use generic error messages
- ❌ Expose sensitive information in errors
- ❌ Crash on validation failures
- ❌ Skip error logging

### 7. Performance

**DO:**
- ✅ Cache frequently accessed templates
- ✅ Use lazy loading for large templates
- ✅ Optimize database queries
- ✅ Batch process multiple leases
- ✅ Index searchable fields
- ✅ Monitor performance metrics

**DON'T:**
- ❌ Load all templates at once
- ❌ Perform synchronous heavy operations
- ❌ Skip database indexing
- ❌ Ignore memory usage
- ❌ Block UI during validation

---

## Troubleshooting

### Common Issues

#### Issue: Template Validation Fails
**Symptom:** `Template validation failed: Missing mandatory clause`

**Solution:**
```typescript
// Check which clauses are required
const mandatoryClauses = engine.getMandatoryClauses('CA');
console.log('Required clauses:', mandatoryClauses);

// Add missing clauses
template.clauses.push({
  id: 'lead_paint_disclosure',
  title: 'Lead-Based Paint Disclosure',
  content: '...',
  category: 'disclosures',
  order: 1,
  isMandatory: true,
  isStateSpecific: false,
  isCustom: false,
  isEditable: false,
  tags: ['federal-law', 'mandatory'],
  lastUpdated: new Date()
});
```

#### Issue: Security Deposit Exceeds Limit
**Symptom:** `Security deposit exceeds CA limit`

**Solution:**
```typescript
// Check state limits
const validation = engine.validateSecurityDeposit('CA', 5000, 2000, false);
if (!validation.isValid) {
  console.log(`Max allowed: $${validation.maxAllowed}`);
  // Adjust deposit
  lease.securityDeposit = validation.maxAllowed;
}
```

#### Issue: Prohibited Clause Detected
**Symptom:** `Template contains prohibited clause for NY`

**Solution:**
```typescript
// Check if clause is prohibited
if (engine.isClauseProhibited('NY', 'waiver_of_jury_trial')) {
  // Remove the clause
  template.clauses = template.clauses.filter(
    c => c.id !== 'waiver_of_jury_trial'
  );
}
```

---

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**
   - AI-powered clause suggestions
   - Predictive compliance checking
   - Automated clause optimization

2. **Multi-Language Support**
   - Template translation
   - Localized legal requirements
   - Bilingual lease generation

3. **Advanced Analytics**
   - Template usage statistics
   - Compliance trend analysis
   - Performance metrics dashboard

4. **Integration Capabilities**
   - DocuSign integration
   - Property management system APIs
   - Payment processor integration

5. **Enhanced Validation**
   - Real-time compliance checking
   - Automated clause conflict detection
   - Intelligent error recovery

---

## Support

For questions, issues, or feature requests:
- Email: support@leaseengine.com
- Documentation: https://docs.leaseengine.com
- GitHub: https://github.com/leaseengine/template-engine

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Author:** Alex (Engineer)