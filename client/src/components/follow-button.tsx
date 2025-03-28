const handleFollow = async () => {
    setIsFollowing(!isFollowing); // Optimistic update
    try {
      await followMutation.mutateAsync();
      queryClient.invalidateQueries(['profile', username]);
    } catch (error) {
      setIsFollowing(isFollowing); // Revert on error
    }
  };