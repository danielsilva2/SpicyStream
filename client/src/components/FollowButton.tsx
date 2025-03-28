const handleFollow = async () => {
    const method = isFollowing ? 'DELETE' : 'POST';
    setIsFollowing(!isFollowing);
    try {
      await fetch(`/api/users/${username}/follow`, {
        method,
        credentials: 'include'
      });
    } catch (error) {
      setIsFollowing(isFollowing); // Revert on error
      console.error('Follow action failed:', error);
    }
  };