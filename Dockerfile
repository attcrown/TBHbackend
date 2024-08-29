# ใช้ node image ที่มีรุ่นที่เหมาะสม
FROM node:16-alpine

# ตั้งค่าตำแหน่งทำงาน
WORKDIR /usr/src/app

# คัดลอก package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกโค้ดทั้งหมดไปยัง container
COPY . .

# คอมไพล์ TypeScript เป็น JavaScript
RUN npm run build

# เปิดพอร์ตสำหรับการเข้าถึงแอปพลิเคชัน
EXPOSE 3000

# คำสั่งในการรันแอปพลิเคชัน
CMD ["npm", "start"]
