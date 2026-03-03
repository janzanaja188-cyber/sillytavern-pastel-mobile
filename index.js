// index.js - The "Mobile Survival" Edition

(function() {
    console.log("💎 CHRYSO: Initiating Mobile Protocol...");

    // ฟังก์ชันสร้าง UI
    function injectMobileUI() {
        // ป้องกันการสร้างซ้ำ (Duplicate Check)
        if (document.getElementById('pastel-mobile-button')) return;

        console.log("💎 CHRYSO: Injecting Elements...");

        // 1. สร้างปุ่ม (ใช้ Vanilla JS ล้วนๆ ไม่พึ่ง jQuery)
        const btn = document.createElement('div');
        btn.id = 'pastel-mobile-button';
        btn.innerHTML = '📱';
        btn.style.cssText = `
            position: fixed;
            top: 10px; /* ย้ายไปมุมซ้ายบน หนี Keyboard */
            left: 10px;
            width: 50px;
            height: 50px;
            background: red; /* สีแดงสดเพื่อให้เห็นชัดที่สุด */
            color: white;
            font-size: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            z-index: 999999; /* สูงเสียดฟ้า */
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            cursor: pointer;
            border: 2px solid white;
        `;

        // 2. สร้างหน้าจอมือถือ
        const phone = document.createElement('div');
        phone.id = 'pastel-mobile-ui';
        phone.style.cssText = `
            position: fixed;
            top: 70px;
            left: 10px;
            width: 300px;
            height: 500px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 20px;
            z-index: 999999;
            display: none;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            overflow: hidden;
        `;

        phone.innerHTML = `
            <div style="background:#333; color:#fff; padding:10px; display:flex; justify-content:space-between;">
                <span>Mobile OS</span>
                <span id="mobile-close-btn" style="cursor:pointer; color:red;">✖</span>
            </div>
            <div style="flex:1; padding:10px; background:#f0f0f0;">
                <p style="color:black;">ระบบมือถือพร้อมใช้งาน</p>
                <button id="mobile-test-btn" style="padding:10px; width:100%;">ทดสอบส่งข้อความ</button>
            </div>
        `;

        // 3. ยัดใส่ Body
        document.body.appendChild(btn);
        document.body.appendChild(phone);

        // 4. ผูก Event
        btn.onclick = function() {
            const ui = document.getElementById('pastel-mobile-ui');
            ui.style.display = (ui.style.display === 'none') ? 'flex' : 'none';
        };

        document.getElementById('mobile-close-btn').onclick = function() {
            document.getElementById('pastel-mobile-ui').style.display = 'none';
        };

        document.getElementById('mobile-test-btn').onclick = function() {
            alert("เชื่อมต่อสำเร็จ! (Connection Established)");
        };
    }

    // รอ 2 วินาทีเพื่อให้แน่ใจว่าหน้าเว็บโหลดเสร็จ (เผื่อเครื่องช้า)
    setTimeout(injectMobileUI, 2000);

})();
