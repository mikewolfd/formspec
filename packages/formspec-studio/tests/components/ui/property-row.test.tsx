import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PropertyRow } from '../../../src/components/ui/PropertyRow';

describe('PropertyRow', () => {
  it('renders label and value', () => {
    render(<PropertyRow label="Type">field</PropertyRow>);
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('field')).toBeInTheDocument();
  });

  it('shows help tooltip when help prop is provided', () => {
    render(<PropertyRow label="Precision" help="Number of decimal places.">2</PropertyRow>);
    expect(screen.getByLabelText('Help')).toBeInTheDocument();

    const wrapper = screen.getByText('Precision').closest('[class*="cursor-help"]')!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Number of decimal places.');
  });

  it('does not show help indicator when no help prop', () => {
    render(<PropertyRow label="Type">field</PropertyRow>);
    expect(screen.queryByLabelText('Help')).not.toBeInTheDocument();
  });
});
