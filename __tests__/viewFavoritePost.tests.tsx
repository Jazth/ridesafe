import React, { useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react-native';
import { View, Text } from 'react-native';

const TestComponent = ({ post }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSavedForThisItem, setIsSavedForThisItem] = useState(false);
  const [saveCount, setSaveCount] = useState(0);

  useEffect(() => {
    setIsLiked(post.isLikedByCurrentUser || false);
    setLikeCount(post.likesCount || 0);
    setIsSavedForThisItem(post.isSavedByCurrentUser || false);
    setSaveCount(post.savesCount || 0);
  }, [post.isLikedByCurrentUser, post.likesCount, post.isSavedByCurrentUser, post.savesCount]);

  return (
    <View>
      <Text testID="is-liked">{isLiked.toString()}</Text>
      <Text testID="like-count">{likeCount}</Text>
      <Text testID="is-saved">{isSavedForThisItem.toString()}</Text>
      <Text testID="save-count">{saveCount}</Text>
    </View>
  );
};

describe('Post State useEffect', () => {

  it('should initialize state correctly from initial post props', () => {
    const mockPost = {
      isLikedByCurrentUser: true,
      likesCount: 5,
      isSavedByCurrentUser: false,
      savesCount: 2,
    };

    render(<TestComponent post={mockPost} />);

    expect(screen.getByTestId('is-liked')).toHaveTextContent('true');
    expect(screen.getByTestId('like-count')).toHaveTextContent('5');
    expect(screen.getByTestId('is-saved')).toHaveTextContent('false');
    expect(screen.getByTestId('save-count')).toHaveTextContent('2');
  });
  it('should update state when post props change', () => {
    const initialPost = {
      isLikedByCurrentUser: true,
      likesCount: 5,
      isSavedByCurrentUser: true,
      savesCount: 2,
    };
    const updatedPost = {
      isLikedByCurrentUser: false,
      likesCount: 6,
      isSavedByCurrentUser: false,
      savesCount: 3,
    };

    const { rerender } = render(<TestComponent post={initialPost} />);
    rerender(<TestComponent post={updatedPost} />);
    expect(screen.getByTestId('is-liked')).toHaveTextContent('false');
    expect(screen.getByTestId('like-count')).toHaveTextContent('6');
    expect(screen.getByTestId('is-saved')).toHaveTextContent('false');
    expect(screen.getByTestId('save-count')).toHaveTextContent('3');
  });
});
