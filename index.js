export default function () {

    console.log("Pastel Mobile Loaded");

    const button = document.createElement("div");
    button.id = "pastel-mobile-button";
    button.textContent = "📱";
    document.body.appendChild(button);

    const phone = document.createElement("div");
    phone.id = "pastel-mobile-ui";
    phone.innerHTML = `
        <div class="phone-header">Pastel Phone</div>
        <div class="phone-content">
            <textarea placeholder="พิมพ์ข้อความ..."></textarea>
            <button id="close-btn">ปิด</button>
        </div>
    `;
    document.body.appendChild(phone);

    phone.style.display = "none";

    button.onclick = () => {
        phone.style.display = "flex";
    };

    phone.querySelector("#close-btn").onclick = () => {
        phone.style.display = "none";
    };
}
