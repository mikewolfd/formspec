import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from '../src/App';

describe('Smoke', () => {
  it('mounts Studio by default', () => {
    render(<App pathname="/studio/" />);
    expect(screen.getByText('The Stack')).toBeInTheDocument();
  });

  it('mounts Inquest on /inquest routes', () => {
    render(<App pathname="/inquest/" />);
    expect(screen.getByTestId('stack-assistant')).toBeInTheDocument();
    expect(screen.getByText('Form Builder')).toBeInTheDocument();
  });
});
