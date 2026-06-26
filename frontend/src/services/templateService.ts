import { supabase } from '@/lib/supabase/client';
import type { DocumentTemplate, GenerateDocumentRequest, TemplateVariable } from '@/types/document';

export class TemplateService {
  /**
   * Create a new template
   */
  static async createTemplate(data: {
    name: string;
    category: string;
    description?: string;
    content: string;
    variables: string[];
    landlordId: string;
    isPublic?: boolean;
  }): Promise<DocumentTemplate> {
    const { data: template, error } = await supabase
      .from('document_templates')
      .insert({
        name: data.name,
        category: data.category,
        description: data.description,
        content: data.content,
        variables: data.variables,
        landlord_id: data.landlordId,
        is_public: data.isPublic || false,
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToTemplate(template);
  }

  /**
   * Get all templates (public + user's own)
   */
  static async getTemplates(landlordId: string): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .or(`is_public.eq.true,landlord_id.eq.${landlordId}`)
      .order('category')
      .order('name');

    if (error) throw error;
    return data.map(this.mapToTemplate);
  }

  /**
   * Get templates by category
   */
  static async getTemplatesByCategory(
    category: string,
    landlordId: string
  ): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('category', category)
      .or(`is_public.eq.true,landlord_id.eq.${landlordId}`)
      .order('name');

    if (error) throw error;
    return data.map(this.mapToTemplate);
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(id: string): Promise<DocumentTemplate> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToTemplate(data);
  }

  /**
   * Update template
   */
  static async updateTemplate(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      description?: string;
      content: string;
      variables: string[];
      isPublic: boolean;
    }>
  ): Promise<DocumentTemplate> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.variables !== undefined) updateData.variables = data.variables;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;

    const { data: template, error } = await supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToTemplate(template);
  }

  /**
   * Delete template
   */
  static async deleteTemplate(id: string): Promise<void> {
    // Check if it's a system template
    const template = await this.getTemplateById(id);
    if (template.isSystem) {
      throw new Error('Cannot delete system templates');
    }

    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Duplicate template
   */
  static async duplicateTemplate(id: string, landlordId: string): Promise<DocumentTemplate> {
    const original = await this.getTemplateById(id);

    return this.createTemplate({
      name: `${original.name} (Copy)`,
      category: original.category,
      description: original.description,
      content: original.content,
      variables: original.variables,
      landlordId,
      isPublic: false,
    });
  }

  /**
   * Parse template variables from content
   */
  static parseVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  /**
   * Substitute variables in template content
   */
  static substituteVariables(
    content: string,
    variables: Record<string, string>
  ): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Generate document from template
   */
  static async generateDocument(request: GenerateDocumentRequest): Promise<string> {
    const template = await this.getTemplateById(request.templateId);

    // Substitute variables
    const content = this.substituteVariables(template.content, request.variables);

    // Increment usage count
    await supabase
      .from('document_templates')
      .update({ usage_count: template.usageCount + 1 })
      .eq('id', request.templateId);

    return content;
  }

  /**
   * Get template categories
   */
  static async getCategories(landlordId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('category')
      .or(`is_public.eq.true,landlord_id.eq.${landlordId}`);

    if (error) throw error;

    const categories = new Set(data.map((t) => t.category));
    return Array.from(categories).sort();
  }

  /**
   * Get most used templates
   */
  static async getMostUsedTemplates(
    landlordId: string,
    limit = 5
  ): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .or(`is_public.eq.true,landlord_id.eq.${landlordId}`)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(this.mapToTemplate);
  }

  /**
   * Validate template variables
   */
  static validateVariables(
    template: DocumentTemplate,
    providedVariables: Record<string, string>
  ): { valid: boolean; missing: string[] } {
    const missing = template.variables.filter(
      (variable) => !providedVariables[variable] || providedVariables[variable].trim() === ''
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get template variable definitions
   */
  static getVariableDefinitions(variables: string[]): TemplateVariable[] {
    const definitions: Record<string, TemplateVariable> = {
      current_date: {
        name: 'current_date',
        label: 'Current Date',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0],
      },
      landlord_name: {
        name: 'landlord_name',
        label: 'Landlord Name',
        type: 'text',
        required: true,
      },
      landlord_address: {
        name: 'landlord_address',
        label: 'Landlord Address',
        type: 'text',
        required: true,
      },
      landlord_phone: {
        name: 'landlord_phone',
        label: 'Landlord Phone',
        type: 'phone',
        required: true,
      },
      landlord_email: {
        name: 'landlord_email',
        label: 'Landlord Email',
        type: 'email',
        required: true,
      },
      tenant_name: {
        name: 'tenant_name',
        label: 'Tenant Name',
        type: 'text',
        required: true,
      },
      tenant_phone: {
        name: 'tenant_phone',
        label: 'Tenant Phone',
        type: 'phone',
        required: true,
      },
      tenant_email: {
        name: 'tenant_email',
        label: 'Tenant Email',
        type: 'email',
        required: true,
      },
      property_address: {
        name: 'property_address',
        label: 'Property Address',
        type: 'text',
        required: true,
      },
      monthly_rent: {
        name: 'monthly_rent',
        label: 'Monthly Rent',
        type: 'number',
        required: true,
      },
      security_deposit: {
        name: 'security_deposit',
        label: 'Security Deposit',
        type: 'number',
        required: true,
      },
      lease_start_date: {
        name: 'lease_start_date',
        label: 'Lease Start Date',
        type: 'date',
        required: true,
      },
      lease_end_date: {
        name: 'lease_end_date',
        label: 'Lease End Date',
        type: 'date',
        required: true,
      },
    };

    return variables.map((variable) => {
      return (
        definitions[variable] || {
          name: variable,
          label: variable.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          type: 'text',
          required: false,
        }
      );
    });
  }

  /**
   * Map database record to DocumentTemplate type
   */
  private static mapToTemplate(data: Record<string, unknown>): DocumentTemplate {
    return {
      id: data.id as string,
      name: data.name as string,
      category: data.category as string,
      description: data.description as string | undefined,
      content: data.content as string,
      variables: (data.variables as string[]) || [],
      landlordId: data.landlord_id as string | undefined,
      isPublic: data.is_public as boolean,
      isSystem: data.is_system as boolean,
      thumbnailUrl: data.thumbnail_url as string | undefined,
      usageCount: data.usage_count as number,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}