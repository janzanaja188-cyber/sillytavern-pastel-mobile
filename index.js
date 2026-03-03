console.log("Pastel Mobile UI Loaded");

document.addEventListener("DOMContentLoaded", () => {

    // สร้างปุ่มลอย
    const button = document.createElement("div");
    button.id = "pastel-mobile-button";
    button.innerText = "📱";
    document.body.appendChild(button);

    // สร้างมือถือจำลอง
    const phone = document.createElement("div");
    phone.id = "pastel-mobile-ui";
    phone.innerHTML = `
        <div class="phone-header">Pastel Phone</div>
        <div class="phone-content">
            <p>นี่คือมือถือจำลอง</p>
            <button id="close-phone">ปิด</button>
        </div>
    `;
    document.body.appendChild(phone);

    // ซ่อนก่อน
    phone.style.display = "none";

    // กดเปิด
    button.addEventListener("click", () => {
        phone.style.display = "block";
    });

    // กดปิด
    phone.querySelector("#close-phone").addEventListener("click", () => {
        phone.style.display = "none";
    });

});
