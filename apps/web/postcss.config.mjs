// Tailwind v4 ใส่ทุก style ไว้ใน @layer — เบราว์เซอร์รุ่นเก่า (Chrome/Edge < 99, Safari < 15.4, in-app browser บางตัว)
// ไม่รู้จัก @layer แล้วทิ้ง style ทั้งหมด หน้าเว็บจึงไม่มี CSS เลย
// postcss-cascade-layers แปลง @layer เป็น CSS ธรรมดาโดยคงลำดับความสำคัญเดิมไว้
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    "@csstools/postcss-cascade-layers": {},
  },
};
