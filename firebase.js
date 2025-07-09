// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCmT-IaMUbJJgv6kVucXdz9IDzmlfDBFBQ",
  authDomain: "tubelink-vip.firebaseapp.com",
  projectId: "tubelink-vip",
  storageBucket: "tubelink-vip.firebasestorage.app",
  messagingSenderId: "696746132408",
  appId: "1:696746132408:web:f545adda8910ea5631854d",
  measurementId: "G-JB26FZ2YWC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// متابعة حالة المصادقة
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("User logged in: ", user.email);
    // إخفاء روابط تسجيل الدخول والتسجيل
    document.querySelectorAll('.auth-link').forEach(el => el.style.display = 'none');
    // إظهار رابط الخروج
    document.querySelectorAll('.logout-link').forEach(el => el.style.display = 'block');
    // إظهار زر إضافة فيديو إذا كان في الصفحة الرئيسية
    if (document.getElementById('addVideoBtn')) {
      document.getElementById('addVideoBtn').style.display = 'block';
    }
  } else {
    console.log("User logged out");
    // إظهار روابط تسجيل الدخول والتسجيل
    document.querySelectorAll('.auth-link').forEach(el => el.style.display = 'block');
    // إخفاء رابط الخروج
    document.querySelectorAll('.logout-link').forEach(el => el.style.display = 'none');
    // إخفاء زر إضافة فيديو إذا كان في الصفحة الرئيسية
    if (document.getElementById('addVideoBtn')) {
      document.getElementById('addVideoBtn').style.display = 'none';
    }
  }
});

// تسجيل الخروج
function logout() {
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  }).catch(error => {
    console.error("Logout error: ", error);
  });
}

// حفظ الفيديو في Firestore
function saveVideo() {
  const user = auth.currentUser;
  if (!user) {
    alert('يجب تسجيل الدخول أولاً');
    window.location.href = 'login.html';
    return;
  }

  const videoTitle = document.getElementById('videoTitle').value;
  const videoUrl = document.getElementById('videoUrl').value;
  const videoDescription = document.getElementById('videoDescription').value;

  if (!videoTitle || !videoUrl) {
    alert('يجب إدخال عنوان الفيديو ورابطه');
    return;
  }

  db.collection('videos').add({
    title: videoTitle,
    url: videoUrl,
    description: videoDescription || '',
    userId: user.uid,
    userEmail: user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert('تم حفظ الفيديو بنجاح');
    window.location.href = 'index.html';
  }).catch(error => {
    console.error("Error adding video: ", error);
    alert('حدث خطأ أثناء حفظ الفيديو');
  });
}

// جلب الفيديوهات من Firestore
function loadVideos() {
  const videosContainer = document.getElementById('videosContainer');
  if (!videosContainer) return;

  const user = auth.currentUser;
  
  db.collection('videos').orderBy('createdAt', 'desc').get()
    .then(snapshot => {
      videosContainer.innerHTML = '';
      snapshot.forEach(doc => {
        const video = doc.data();
        
        // التحقق مما إذا كان المستخدم مشتركًا متميزًا
        if (user) {
          db.collection('users').doc(user.uid).get()
            .then(userDoc => {
              const isPremiumUser = userDoc.exists && userDoc.data().premium;
              displayVideo(video, isPremiumUser);
            });
        } else {
          displayVideo(video, false);
        }
      });
    })
    .catch(error => {
      console.error("Error loading videos: ", error);
    });
}

// عرض الفيديو مع الجودة المناسبة
function displayVideo(video, isPremiumUser) {
  const videosContainer = document.getElementById('videosContainer');
  
  const videoElement = `
    <div class="video-card">
      <h3>${video.title}</h3>
      <div class="video-wrapper">
        <iframe 
          src="${getEmbedUrl(video.url, isPremiumUser)}" 
          frameborder="0" 
          allowfullscreen
        ></iframe>
      </div>
      ${video.description ? `<p>${video.description}</p>` : ''}
      <small>تم النشر بواسطة: ${video.userEmail}</small>
      ${!isPremiumUser ? `<div class="premium-notice">
        <p>للمشاهدة بجودة 1080p، يرجى التواصل مع المسؤول</p>
        <p>اذا كنت مشترك PREMUIM يمكنك تعديل الجودة بعلامة الترس داخل الفيديو</p>
        <a href="premium.html" class="premium-btn">معلومات الاشتراك المتميز</a>
      </div>` : ''}
    </div>
  `;
  videosContainer.innerHTML += videoElement;
}

// تحويل رابط YouTube إلى رابط embed
function getEmbedUrl(url, allowHighQuality = true) {
  if (!url) return '';
  
  // إذا كان رابط YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1];
      const ampersandPosition = videoId.indexOf('&');
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
    } else if (url.includes('youtu.be')) {
      videoId = url.split('youtu.be/')[1];
    }
    
    if (allowHighQuality) {
      return `https://www.youtube.com/embed/${videoId}?vq=hd1080`;
    } else {
      return `https://www.youtube.com/embed/${videoId}?vq=hd720`;
    }
  }
  
  // إذا كان رابط فيميو أو غيرها
  return url;
}

// إنشاء مستند مستخدم تلقائيًا عند التسجيل
function setupAuthStateListener() {
  auth.onAuthStateChanged(user => {
    if (user) {
      // التحقق مما إذا كان المستخدم موجودًا في Firestore
      db.collection('users').doc(user.uid).get().then(doc => {
        if (!doc.exists) {
          // إنشاء مستند جديد للمستخدم
          db.collection('users').doc(user.uid).set({
            email: user.email,
            premium: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(() => {
            console.log("User document created in Firestore");
          }).catch(error => {
            console.error("Error creating user document: ", error);
          });
        }
      });
    }
  });
}

// تهيئة المستمع لحالة المصادقة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  setupAuthStateListener();
  loadVideos();
});