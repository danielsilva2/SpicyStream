
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const TEST_USERS = [
  { username: 'test1', password: 'password123' },
  { username: 'test2', password: 'password123' },
  // Add more test users as needed
];

const SAMPLE_CONTENT = [
  // Free test videos from Mixkit
  'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-young-woman-practicing-yoga-at-sunset-1721-large.mp4',
  
  // Free test images from Unsplash
  'https://images.unsplash.com/photo-1682686581551-867e0b208bd1',
  'https://images.unsplash.com/photo-1682687982183-c2937a74df3d',
  'https://images.unsplash.com/photo-1682695796954-bad0d0f59ff1'
];

async function downloadFile(url: string, outputPath: string) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  
  response.data.pipe(fs.createWriteStream(outputPath));
  
  return new Promise((resolve, reject) => {
    response.data.on('end', resolve);
    response.data.on('error', reject);
  });
}

async function uploadFile(filePath: string, token: string) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('title', path.basename(filePath));
  form.append('description', 'Test upload');
  form.append('visibility', 'public');
  
  await axios.post('http://localhost:5000/api/upload', form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  });
}

async function main() {
  const uploadDir = path.join(__dirname, '..', 'test-uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  
  for (const user of TEST_USERS) {
    // Login
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', user);
    const token = loginRes.data.token;
    
    // Download and upload files
    for (const contentUrl of SAMPLE_CONTENT) {
      const fileName = path.basename(contentUrl);
      const filePath = path.join(uploadDir, fileName);
      
      console.log(`Downloading ${fileName}...`);
      await downloadFile(contentUrl, filePath);
      
      console.log(`Uploading ${fileName} as ${user.username}...`);
      await uploadFile(filePath, token);
      
      fs.unlinkSync(filePath); // Clean up downloaded file
    }
  }
  
  console.log('Test uploads completed!');
}

main().catch(console.error);
