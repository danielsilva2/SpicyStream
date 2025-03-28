
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const TEST_USERS = [
  { username: 'test1', password: 'password123' },
  { username: 'test2', password: 'password123' },
];

const SAMPLE_VIDEOS = [
  // Free test videos from Mixkit
  'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-young-woman-practicing-yoga-at-sunset-1721-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-man-under-multicolored-lights-1237-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-bright-lights-through-a-crystal-ball-1238-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-mother-with-her-little-daughter-eating-a-marshmallow-in-nature-39764-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-winter-fashion-cold-looking-woman-concept-video-39874-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-womans-feet-splashing-in-the-pool-1261-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-a-girl-blowing-a-bubble-gum-balloon-2604-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-going-down-a-curved-highway-through-a-mountain-range-41576-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-man-holding-neon-light-1238-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-wearing-flowers-1232-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-tree-in-the-wind-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-abstract-background-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smart-watch-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-running-under-fall-trees-32809-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-couple-walking-together-in-a-park-with-their-dog-40897-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-fresh-apples-in-a-supermarket-42098-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-at-the-beach-1261-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-at-sunset-1721-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-man-under-multicolored-lights-1237-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-bright-lights-through-a-crystal-ball-1238-large.mp4'
];

const SAMPLE_IMAGES = [
  // Free test images from Unsplash
  'https://images.unsplash.com/photo-1682686581551-867e0b208bd1',
  'https://images.unsplash.com/photo-1682687982183-c2937a74df3d',
  'https://images.unsplash.com/photo-1682695796954-bad0d0f59ff1',
  'https://images.unsplash.com/photo-1695653420960-8fb9ee7f5cbd',
  'https://images.unsplash.com/photo-1695653420780-f21e0973161a',
  'https://images.unsplash.com/photo-1695653420753-8c91764c5d77',
  'https://images.unsplash.com/photo-1695653420744-47654足e9d1b',
  'https://images.unsplash.com/photo-1695653420738-7b4e7f8d0b3a',
  'https://images.unsplash.com/photo-1695653420732-1c2e8f8d0b3a',
  'https://images.unsplash.com/photo-1695653420726-0c2e8f8d0b3a'
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

async function uploadFile(filePath: string, token: string, title: string) {
  const form = new FormData();
  form.append('files', fs.createReadStream(filePath));
  form.append('title', title);
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
  }
  
  console.log('Test uploads completed!');
}

main().catch(console.error);
