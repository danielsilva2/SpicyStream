import React from 'react';

function VideoCard({ username, viewCount }) { // Added viewCount prop
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      {/* ... other video card content ... */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{username}</span>
        <span>•</span>
        <span>{viewCount} views</span> {/* Added view count display */}
      </div>
      {/* ... rest of the video card content ... */}
    </div>
  );
}

export default VideoCard;