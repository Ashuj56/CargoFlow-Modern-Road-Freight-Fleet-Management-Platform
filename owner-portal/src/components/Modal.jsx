import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(6,14,26,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 style={{ margin: 0 }}>{title}</h4>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-2 flex justify-between">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
