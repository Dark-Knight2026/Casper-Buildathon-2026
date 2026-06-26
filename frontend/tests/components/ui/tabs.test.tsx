import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function renderTabs(listClassName?: string) {
  return render(
    <Tabs defaultValue="a">
      <TabsList className={listClassName} data-testid="tabs-list">
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  describe('TabsList default classes', () => {
    it('applies the h-14 default height', () => {
      renderTabs();
      expect(
        screen.getByTestId('tabs-list').className,
        'TabsList should default to h-14 (refreshed dashboard spacing)'
      ).toContain('h-14');
    });

    it('applies the mb-4 default bottom margin', () => {
      renderTabs();
      expect(
        screen.getByTestId('tabs-list').className,
        'TabsList should default to mb-4 to give breathing room around the tab bar'
      ).toContain('mb-4');
    });
  });

  describe('TabsList className override', () => {
    it('merges caller className alongside defaults', () => {
      renderTabs('h-10 custom-list');
      const list = screen.getByTestId('tabs-list');
      expect(
        list.className,
        'caller-supplied className should be merged into TabsList output'
      ).toContain('custom-list');
      expect(
        list.className,
        'caller-supplied size override (h-10) should be preserved'
      ).toContain('h-10');
    });
  });

  describe('TabsTrigger default classes', () => {
    it('applies cursor-pointer to triggers', () => {
      renderTabs();
      const trigger = screen.getByRole('tab', { name: 'A' });
      expect(
        trigger.className,
        'TabsTrigger should default to cursor-pointer so the hit area looks clickable'
      ).toContain('cursor-pointer');
    });
  });

  describe('TabsContent default panel', () => {
    it('renders the panel for the active tab', () => {
      renderTabs();
      expect(
        screen.getByText('Panel A'),
        'active tab panel should be rendered'
      ).toBeInTheDocument();
    });
  });
});
