import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AddKeyModal from './AddKeyModal';

describe('AddKeyModal', () => {
  it('renders with provider selection step', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    expect(screen.getByText('Select AI Provider')).toBeDefined();
    expect(screen.getByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('OpenAI')).toBeDefined();
  });

  it('shows 14 provider options', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(14);
  });

  it('switches to detail step on provider click', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Groq Cloud'));
    expect(screen.getByText('Configure Groq')).toBeDefined();
  });

  it('shows form fields in detail step', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('OpenAI'));
    expect(screen.getByLabelText('Connection name')).toBeDefined();
    expect(screen.getByLabelText('API key')).toBeDefined();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(<AddKeyModal onClose={onClose} />);
    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<AddKeyModal onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows error on submit with empty fields', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('OpenAI'));
    fireEvent.click(screen.getByText('Connect Provider'));
    expect(screen.getByText('Label and API key are required.')).toBeDefined();
  });

  it('toggles API key visibility', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('OpenAI'));
    const keyInput = screen.getByLabelText('API key') as HTMLInputElement;
    expect(keyInput.type).toBe('password');
    fireEvent.click(screen.getByLabelText('Show key'));
    expect(keyInput.type).toBe('text');
    fireEvent.click(screen.getByLabelText('Hide key'));
    expect(keyInput.type).toBe('password');
  });

  it('goes back to provider selection from details', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('OpenAI'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Select AI Provider')).toBeDefined();
  });

  it('pre-fills label when provider is selected', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Google Gemini'));
    const nameInput = screen.getByLabelText('Connection name') as HTMLInputElement;
    expect(nameInput.value).toBe('Google Gemini Key');
  });

  it('has dialog role and aria-modal', () => {
    render(<AddKeyModal onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('calls onClose after successful submit', () => {
    const onClose = vi.fn();
    render(<AddKeyModal onClose={onClose} />);
    fireEvent.click(screen.getByText('OpenAI'));
    fireEvent.change(screen.getByLabelText('Connection name'), { target: { value: 'My Key' } });
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'sk-test' } });
    fireEvent.click(screen.getByText('Connect Provider'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
