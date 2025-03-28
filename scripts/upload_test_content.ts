
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_USERS = [
  { username: 'test1', password: 'password123' },
  { username: 'test2', password: 'password123' },
];

const SAMPLE_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
  // Keep other video URLs...
];

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1682686581551-867e0b208bd1',
  'https://images.unsplash.com/photo-1682687982183-c2937a74df3d',
  // Keep other image URLs...
];

async function downloadFile(url: string, outputPath: string) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function uploadFile(filePath: string, token: string, title: string) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('title', title);
  form.append('description', 'Test upload');
  form.append('visibility', 'public');
  
  try {
    await axios.post('http://0.0.0.0:5000/api/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log(`Successfully uploaded: ${title}`);
  } catch (error) {
    console.error(`Failed to upload ${title}:`, error.response?.data || error.message);
  }
}

async function main() {
  const uploadDir = path.join(__dirname, '..', 'test-uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  for (const user of TEST_USERS) {
    try {
      // Login
      console.log(`Logging in as ${user.username}...`);
      const loginRes = await axios.post('http://0.0.0.0:5000/api/auth/login', user);
      const token = loginRes.data.token;
      
      // Upload videos
      for (let i = 0; i < SAMPLE_VIDEOS.length; i++) {
        const videoUrl = SAMPLE_VIDEOS[i];
        const fileName = `test-video-${i + 1}.mp4`;
        const filePath = path.join(uploadDir, fileName);
        
        console.log(`Downloading video ${i + 1}...`);
        await downloadFile(videoUrl, filePath);
        
        console.log(`Uploading video ${i + 1} as ${user.username}...`);
        await uploadFile(filePath, token, `Random Video ${i + 1}`);
        
        fs.unlinkSync(filePath);
      }

      // Upload images
      for (let i = 0; i < SAMPLE_IMAGES.length; i++) {
        const imageUrl = SAMPLE_IMAGES[i];
        const fileName = `test-image-${i + 1}.jpg`;
        const filePath = path.join(uploadDir, fileName);
        
        console.log(`Downloading image ${i + 1}...`);
        await downloadFile(imageUrl, filePath);
        
        console.log(`Uploading image ${i + 1} as ${user.username}...`);
        await uploadFile(filePath, token, `Random Image ${i + 1}`);
        
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error processing user ${user.username}:`, error.message);
    }
  }
  
  console.log('Test uploads completed!');
  
  if (fs.existsSync(uploadDir)) {
    fs.rmdirSync(uploadDir);
  }
}

main().catch(console.error);
