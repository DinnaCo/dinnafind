describe('Jest Setup Test', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle TypeScript features', () => {
    const testFunc = (value: string = 'default'): string => {
      return value;
    };
    
    expect(testFunc()).toBe('default');
    expect(testFunc('test')).toBe('test');
  });

  it('should handle type assertions', () => {
    const mockFn = jest.fn() as jest.Mock;
    mockFn.mockReturnValue('mocked');
    
    expect(mockFn()).toBe('mocked');
  });

  it('should handle const assertions', () => {
    const obj = {
      type: 'test' as const,
      value: 42
    };
    
    expect(obj.type).toBe('test');
  });
});
