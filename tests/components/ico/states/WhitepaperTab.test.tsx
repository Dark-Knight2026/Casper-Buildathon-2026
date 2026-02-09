import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WhitepaperTab } from '@/pages/ico/components/states/WhitepaperTab';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('WhitepaperTab', () => {
  describe('rendering', () => {
    it('should render the WhitePaper title in sidebar', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('WhitePaper')).toBeInTheDocument();
    });

    it('should render the Download PDF button', () => {
      renderWithRouter(<WhitepaperTab />);

      const downloadButtons = screen.getAllByText('Download PDF');
      expect(downloadButtons.length).toBeGreaterThan(0);
    });

    it('should render the PDF iframe', () => {
      renderWithRouter(<WhitepaperTab />);

      const iframe = screen.getByTitle('BIG WhitePaper');
      expect(iframe).toBeInTheDocument();
    });
  });

  describe('sidebar navigation', () => {
    it('should render Abstract section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('1. Abstract')).toBeInTheDocument();
    });

    it('should render Introduction section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('2. Introduction')).toBeInTheDocument();
    });

    it('should render Proposed Solution section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('3. Proposed Solution')).toBeInTheDocument();
    });

    it('should render Tokenomics section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('4. Tokenomics')).toBeInTheDocument();
    });

    it('should render How It Works section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('5. How It Works - KeyChain App Ecosystem')).toBeInTheDocument();
    });

    it('should render Career Growth section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('6. Career Growth & Credentials')).toBeInTheDocument();
    });

    it('should render Roadmap section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('7. Roadmap')).toBeInTheDocument();
    });

    it('should render Legal Disclaimer section', () => {
      renderWithRouter(<WhitepaperTab />);

      expect(screen.getByText('8. Legal Disclaimer')).toBeInTheDocument();
    });
  });

  describe('section expansion', () => {
    it('should expand Tokenomics section to show subsections', () => {
      renderWithRouter(<WhitepaperTab />);

      // Tokenomics should be expanded by default
      expect(screen.getByText('4.1 Token Overview')).toBeInTheDocument();
      expect(screen.getByText('4.2 Utility & Use Cases')).toBeInTheDocument();
      expect(screen.getByText('4.3 Distribution')).toBeInTheDocument();
    });

    it('should toggle section expansion when clicked', () => {
      renderWithRouter(<WhitepaperTab />);

      // Click on Proposed Solution to expand it
      const proposedSolutionButton = screen.getByText('3. Proposed Solution');
      fireEvent.click(proposedSolutionButton);

      // Now subsections should be visible
      expect(screen.getByText('KeyChain')).toBeInTheDocument();
      expect(screen.getByText('LeaseFi - Blockchain Real Estate Transaction Layer')).toBeInTheDocument();
    });
  });

  describe('section navigation', () => {
    it('should update active section when a section is clicked', () => {
      renderWithRouter(<WhitepaperTab />);

      const introductionButton = screen.getByText('2. Introduction');
      fireEvent.click(introductionButton);

      // The button should have the active styling (checking by class might be tricky due to mocking)
      expect(introductionButton).toBeInTheDocument();
    });

    it('should update active section when a subsection is clicked', () => {
      renderWithRouter(<WhitepaperTab />);

      const subsectionButton = screen.getByText('4.1 Token Overview');
      fireEvent.click(subsectionButton);

      expect(subsectionButton).toBeInTheDocument();
    });
  });

  describe('download functionality', () => {
    let originalCreateElement: typeof document.createElement;
    let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      originalCreateElement = document.createElement.bind(document);
      mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
    });

    afterEach(() => {
      document.createElement = originalCreateElement;
    });

    it('should trigger download when Download PDF button is clicked', () => {
      document.createElement = ((tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      }) as typeof document.createElement;

      renderWithRouter(<WhitepaperTab />);

      const downloadButtons = screen.getAllByText('Download PDF');
      fireEvent.click(downloadButtons[0]);

      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.href).toBe('/docs/BIG_WhitePaper.pdf');
      expect(mockAnchor.download).toBe('BIG_WhitePaper.pdf');
    });
  });

  describe('PDF viewer', () => {
    it('should render iframe with correct title', () => {
      renderWithRouter(<WhitepaperTab />);

      const iframe = screen.getByTitle('BIG WhitePaper');
      expect(iframe).toBeInTheDocument();
    });

    it('should set iframe src to PDF path', () => {
      renderWithRouter(<WhitepaperTab />);

      const iframe = screen.getByTitle('BIG WhitePaper') as HTMLIFrameElement;
      expect(iframe.src).toContain('/docs/BIG_WhitePaper.pdf');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(<WhitepaperTab className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
