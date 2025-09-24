import React from 'react';
import renderer, { act } from 'react-test-renderer';
import CustomImage from '../CustomImage';

describe('CustomImage', () => {
  it('renders correctly with source', () => {
    let component: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <CustomImage source={{ uri: 'https://example.com/image.png' }} />
      );
    });
    const tree = component!.toJSON();
    expect(tree).toMatchSnapshot();
    act(() => {
      component!.unmount();
    });
  });

  it('renders correctly with style', () => {
    let component: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <CustomImage
          source={{ uri: 'https://example.com/image.png' }}
          style={{ width: 100, height: 100 }}
        />
      );
    });
    const tree = component!.toJSON();
    expect(tree).toMatchSnapshot();
    act(() => {
      component!.unmount();
    });
  });
});
