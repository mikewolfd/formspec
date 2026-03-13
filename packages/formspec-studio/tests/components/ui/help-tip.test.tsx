import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HelpTip } from '../../../src/components/ui/HelpTip';

describe('HelpTip', () => {
  it('renders children and a ? indicator', () => {
    render(<HelpTip text="Some help">Label</HelpTip>);
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Help')).toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(<HelpTip text="Some help text">Label</HelpTip>);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByText('Label').closest('[class*="cursor-help"]')!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Some help text');
  });

  it('hides tooltip on mouse leave', () => {
    render(<HelpTip text="Some help text">Label</HelpTip>);
    const wrapper = screen.getByText('Label').closest('[class*="cursor-help"]')!;

    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
