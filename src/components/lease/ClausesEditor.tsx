/**
 * Editable list of lease clauses. Keeps a stable per-row `key` so adding or
 * removing a clause mid-list doesn't shuffle the controlled inputs (the wire
 * `Clause` has no id, so the key lives only in the editor model).
 */

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Clause } from '@/types/leaseContract';

/** A clause plus a stable local `key` for React reconciliation. */
export interface ClauseRow extends Clause {
  key: string;
}

interface ClausesEditorProps {
  rows: ClauseRow[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<Clause>) => void;
  onRemove: (index: number) => void;
}

export function ClausesEditor({
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: ClausesEditorProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Clauses (optional)</CardTitle>
            <CardDescription>
              Custom terms attached to the lease.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Clause
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clauses added.</p>
        ) : (
          rows.map((row, i) => (
            <div key={row.key} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Clause {i + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={row.title}
                  onChange={(e) => onUpdate(i, { title: e.target.value })}
                  placeholder="Title"
                />
                <Input
                  value={row.category}
                  onChange={(e) => onUpdate(i, { category: e.target.value })}
                  placeholder="Category (e.g. rent-payment)"
                />
              </div>
              <Textarea
                value={row.content}
                onChange={(e) => onUpdate(i, { content: e.target.value })}
                placeholder="Clause text"
                rows={3}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
