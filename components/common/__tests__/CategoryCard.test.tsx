import React from 'react';
import { renderWithProviders } from '@/test-utils';
import { CategoryCard } from '../CategoryCard';
import { mockCategoryPizza } from '@/__fixtures__';

// @rneui/themed and @/theme are automatically mocked via __mocks__/

describe('CategoryCard', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(
      <CategoryCard category={mockCategoryPizza} onPress={() => {}} />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
