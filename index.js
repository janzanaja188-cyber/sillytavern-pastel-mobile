// index.js - The "Intruder" Edition

console.log("💎 CHRYSO: Extension File Loaded!"); // เช็คว่าไฟล์โหลดไหม

// ฟังก์ชันหลักที่จะทำงานทันที
(async function() {
    console.log("💎 CHRYSO: Initializing Mobile UI...");

    // รอให้ jQuery พร้อมใช้งาน (SillyTavern ใช้ jQuery เป็นหลัก)
    while (typeof jQuery === 'undefined') {
        await new Promise(r => setTimeout(r, 100));
    }

    // 1. สร้าง HTML ของมือถือ (ฝัง CSS ในตัวเพื่อความชัวร์)
    const mobileHTML = `
        <div id="pastel-mobile-wrapper" style="position:fixed; z-index:999999; pointer-events:none; width:100vw; height:100vh; top:0; left:0;">

            <!-- ปุ่มเปิด (มุมซ้ายบน) -->
            <div id="pastel-mobile-btn" style="pointer-events:auto; position:absolute; top:10px; left:10px; width:50px; height:50px; background:linear-gradient(135deg, #ff9a9e, #fecfef); border-radius:50%; box-shadow:0 4px 15px rgba(0,0,0,0.3); cursor:pointer; display:flex; justify-content:center; align-items:center; font-size:24px; border:2px solid white;">
                📱
            </div>

            <!-- หน้าจอมือถือ -->
            <div id="pastel-mobile-screen" style="pointer-events:auto; display:none; position:absolute; top:70px; left:10px; width:320px; height:600px; background:#fff; border-radius:30px; border:8px solid #333; box-shadow:0 20px 50px rgba(0,0,0,0.5); overflow:hidden; flex-direction:column;">

                <!-- Header -->
                <div style="background:#333; color:white; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold;">Pastel OS</span>
                    <span id="pastel-close" style="cursor:pointer; color:#ff5555; font-weight:bold;">✖</span>
                </div>

                <!-- Body -->
                <div style="flex:1; background:#f9f9f9; padding:20px; display:flex; justify-content:center; align-items:center; color:#888;">
                    ระบบพร้อมใช้งาน<br>Waiting for input...
                </div>

            </div>
        </div>
    `;

    // 2. ฉีดเข้า Body (ใช้ jQuery เพื่อความปลอดภัย)
    jQuery('body').append(mobileHTML);
    console.log("💎 CHRYSO: UI Injected into DOM");

    // 3. ผูก Event Listeners
    jQuery('#pastel-mobile-btn').on('click', function() {
        console.log("💎 CHRYSO: Button Clicked");
        jQuery('#pastel-mobile-screen').fadeToggle(200).css('display', 'flex');
    });

    jQuery('#pastel-close').on('click', function() {
        jQuery('#pastel-mobile-screen').fadeOut(200);
    });

    // 4. (Optional) ลงทะเบียน Slash Command ถ้าทำได้
    if (window.SlashCommandParser) {
        window.SlashCommandParser.addCommandObject({
            helpString: "Open Mobile UI",
            labels: ['mobile'],
            function: (args, msg) => {
                jQuery('#pastel-mobile-screen').fadeIn(200).css('display', 'flex');
                return "📱 เปิดมือถือแล้วจ้า!";
            }
        });
        console.log("💎 CHRYSO: Slash Command /mobile registered");
    }

})();
                    
