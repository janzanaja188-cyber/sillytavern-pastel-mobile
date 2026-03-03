// index.js - The "Nuclear Injection" Edition

// นี่คือกุญแจดอกเดียวที่ SillyTavern 1.16 จะยอมไข
export function setup() {
    console.log("💎 CHRYSO: Setup Function Called! Injecting Payload...");

    // สร้างระเบิด (Script Tag)
    const script = document.createElement('script');
    script.innerHTML = `
        console.log("💎 CHRYSO: Payload Detonated in Global Scope!");

        // 1. รอให้ jQuery พร้อม (เผื่อมันยังไม่ตื่น)
        const checkReady = setInterval(() => {
            if (window.jQuery) {
                clearInterval(checkReady);
                initMobileUI();
            }
        }, 100);

        function initMobileUI() {
            console.log("💎 CHRYSO: Building UI...");
            const $ = window.jQuery;

            // ลบตัวเก่าทิ้งก่อน (เผื่อมีซาก)
            $('#pastel-mobile-wrapper').remove();

            // สร้าง UI
            const uiHTML = \`
                <div id="pastel-mobile-wrapper" style="position:fixed; z-index:9999999; top:0; left:0; pointer-events:none; width:100%; height:100%;">
                    <!-- ปุ่มเปิด (มุมซ้ายบน สีแดงเดือด) -->
                    <div id="pastel-mobile-btn" style="pointer-events:auto; position:absolute; top:10px; left:10px; width:60px; height:60px; background:red; border:3px solid white; border-radius:50%; box-shadow:0 5px 15px rgba(0,0,0,0.5); cursor:pointer; display:flex; justify-content:center; align-items:center; font-size:30px;">
                        📱
                    </div>

                    <!-- หน้าจอมือถือ -->
                    <div id="pastel-mobile-screen" style="pointer-events:auto; display:none; position:absolute; top:80px; left:10px; width:300px; height:500px; background:white; border:5px solid #333; border-radius:20px; box-shadow:0 20px 50px rgba(0,0,0,0.5); flex-direction:column;">
                        <div style="background:#333; color:white; padding:10px; display:flex; justify-content:space-between;">
                            <b>Mobile OS</b>
                            <span id="pastel-close" style="cursor:pointer; color:red;">✖</span>
                        </div>
                        <div style="flex:1; padding:20px; display:flex; justify-content:center; align-items:center; color:black;">
                            <h1>มันมาแล้วโว้ย!</h1>
                        </div>
                    </div>
                </div>
            \`;

            $('body').append(uiHTML);

            // ผูก Event
            $('#pastel-mobile-btn').on('click', function() {
                $('#pastel-mobile-screen').toggle();
            });

            $('#pastel-close').on('click', function() {
                $('#pastel-mobile-screen').hide();
            });

            // แจ้งเตือนว่าสำเร็จ
            alert("💎 ไครโซ: Extension ทำงานแล้ว! กดปุ่มสีแดงซ้ายบน!");
        }
    `;

    // ยัดระเบิดลงไปใน Body
    document.body.appendChild(script);
}
