##First Step
[node v.20]

npm install

## Start docker Product
docker-compose up
## Down
docker-compose down

## Start docker DB test
docker-compose -f docker-compose.dbtest.yml up
## Down
docker-compose -f docker-compose.dbtest.yml down

# สำหรับ dev start แค่ db
npm run dev:test (mode develop)
# สำหรับ production build ไฟล์ ขึ้น docker
npm run dev:product (mode product)