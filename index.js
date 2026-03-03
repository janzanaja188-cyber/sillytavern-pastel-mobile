// index.js
console.log("EXTENSION LOADED");
alert("⚠️ ไครโซ: Extension โหลดแล้วโว้ยยยย! เห็นข้าไหม!?");

// ถ้า SillyTavern 1.16+ ต้องการ module setup
export function setup() {
    alert("⚠️ ไครโซ: Setup Function ทำงานแล้ว!");
    console.log("Setup executed");
}
