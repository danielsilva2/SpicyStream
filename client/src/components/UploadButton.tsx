const handleUpload = async () => {
    if (!fileInput.current) {
      fileInput.current = document.createElement('input');
      fileInput.current.type = 'file';
      fileInput.current.accept = 'video/*,image/*';
      fileInput.current.multiple = true;
    }

    fileInput.current.click();
    if (!fileInput.current?.files?.length) return;

    // ... rest of the handleUpload function (presumably file upload logic) ...
};