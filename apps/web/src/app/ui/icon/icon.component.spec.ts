import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: '<app-icon [name]="name" />',
})
class HostComponent {
  name = 'pencil';
}

describe('IconComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  function render(name: string): SVGElement | null {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.name = name;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg');
  }

  it('renders an svg for a known name', () => {
    const svg = render('pencil');
    expect(svg).toBeTruthy();
    expect(svg!.querySelector('path')).toBeTruthy();
  });

  it('renders each supported SF Symbol name', () => {
    for (const name of [
      'pencil',
      'photo',
      'plus',
      'trash',
      'square.and.arrow.up',
      'square.on.square',
      'xmark',
      'checkmark',
      'gearshape',
      'arrow.right',
    ]) {
      expect(render(name)!.querySelector('path')).toBeTruthy();
    }
  });

  it('renders an empty svg (no path) for an unknown name', () => {
    const svg = render('does.not.exist');
    expect(svg).toBeTruthy();
    expect(svg!.querySelector('path')).toBeNull();
  });
});
