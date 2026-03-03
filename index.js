// index.js - The Brute Force Edition

// ใช้ jQuery(document).ready เพื่อรับประกันว่า DOM โหลดเสร็จแล้วแน่นอน
jQuery(document).ready(function () {
    console.log("💎 CHRYSO: Pastel Mobile Extension is INJECTING...");

    // 1. สร้างปุ่ม (Button)
    const buttonHTML = `
        <div id="pastel-mobile-button" title="Open Mobile">
            📱
        </div>
    `;

    // 2. สร้างหน้าจอมือถือ (Mobile UI)
    const mobileHTML = `
        <div id="pastel-mobile-ui" style="display: none;">
            <div class="phone-header">
                <span>Pastel OS 1.0</span>
                <span id="close-btn" style="cursor:pointer;">✖</span>
            </div>
            <div class="phone-content">
                <div id="mobile-chat-history" style="flex:1; overflow-y:auto; padding:5px; border:1px solid #eee; margin-bottom:10px; border-radius:10px;">
                    <div style="color:#888; text-align:center; font-size:12px;">- เริ่มต้นการสนทนา -</div>
                </div>
                <textarea id="mobile-input" placeholder="พิมพ์ข้อความที่นี่..."></textarea>
                <button id="send-btn">ส่งข้อความ (Confirm)</button>
            </div>
        </div>
    `;

    // 3. ฉีด HTML เข้าไปใน Body โดยตรง
    jQuery('body').append(buttonHTML);
    jQuery('body').append(mobileHTML);
    console.log("💎 CHRYSO: UI Elements Appended to Body.");

    // 4. ผูก Event (Click Listeners)
    jQuery('#pastel-mobile-button').on('click', function () {
        console.log("💎 CHRYSO: Button Clicked!");
        jQuery('#pastel-mobile-ui').fadeIn(200).css('display', 'flex');
    });

    jQuery('#close-btn').on('click', function () {
        jQuery('#pastel-mobile-ui').fadeOut(200);
    });

    jQuery('#send-btn').on('click', function () {
        const text = jQuery('#mobile-input').val();
        if (text) {
            alert("ระบบจำลอง: ส่งข้อความ -> " + text);
            jQuery('#mobile-chat-history').append(`<div style="text-align:right; margin:5px;">${text}</div>`);
            jQuery('#mobile-input').val('');
        }
    });
});
                           
