/**
 * Skip Navigation Link Component
 * Allows keyboard users to skip repetitive navigation and jump to main content
 */

export default function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="skip-nav-link"
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      onFocus={(e) => {
        e.currentTarget.style.position = 'fixed';
        e.currentTarget.style.left = '0';
        e.currentTarget.style.top = '0';
        e.currentTarget.style.width = 'auto';
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.padding = '1rem';
        e.currentTarget.style.backgroundColor = '#2563eb';
        e.currentTarget.style.color = 'white';
        e.currentTarget.style.zIndex = '9999';
        e.currentTarget.style.textDecoration = 'none';
        e.currentTarget.style.fontWeight = 'bold';
      }}
      onBlur={(e) => {
        e.currentTarget.style.position = 'absolute';
        e.currentTarget.style.left = '-10000px';
        e.currentTarget.style.top = 'auto';
        e.currentTarget.style.width = '1px';
        e.currentTarget.style.height = '1px';
        e.currentTarget.style.padding = '0';
      }}
    >
      Skip to main content
    </a>
  );
}