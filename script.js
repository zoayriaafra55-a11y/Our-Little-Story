/* =========================================================
   OUR LITTLE STORY
   COMPLETE JAVASCRIPT
========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION

   REPLACE THESE TWO VALUES
========================================================= */

const SUPABASE_URL = "https://edhycsnaexlixgujqwvj.supabase.co";

const SUPABASE_KEY = "sb_publishable_8iQAzI21l4orCRp2A48U2w_AP_4_B5A";

// Change this to the password you want for the Screenshots page.
// This is a convenience lock only; see README for proper private-data security.
const SCREENSHOTS_PASSWORD = "change-this-password";
let screenshotsUnlocked = false;


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;

let currentRoom = null;

let currentProfile = null;

let realtimeChannel = null;

let doodleChannel = null;

let editingId = null;

let currentBrushColor = "#3f3151";

let currentBrushSize = 6;

let currentTool = "brush";

let isDrawing = false;

let currentStroke = [];

let canvas;
let ctx;

let canvasWidth = 1000;
let canvasHeight = 700;


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    const isPasswordRecovery =
        window.location.hash.includes("type=recovery") ||
        new URLSearchParams(window.location.search).get("reset-password") === "1";

    if (isPasswordRecovery) {
        showScreen("resetPasswordScreen");
    } else {
        const {
            data: {
                session
            }
        } = await supabaseClient.auth.getSession();

        if (session) {
            currentUser = session.user;
            await afterLogin();
        } else {
            showScreen("authScreen");
        }
    }

    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                showScreen("resetPasswordScreen");
                return;
            }

            if (session) {
                currentUser = session.user;
            } else {
                currentUser = null;
                currentRoom = null;
                showScreen("authScreen");
            }
        }
    );
}


/* =========================================================
   SCREEN MANAGEMENT
========================================================= */

function showScreen(screenId) {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {
            screen.classList.add("hidden");
        });

    document
        .getElementById(screenId)
        .classList.remove("hidden");

    document
        .getElementById("app")
        .classList.add("hidden");
}


function showApp() {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {
            screen.classList.add("hidden");
        });

    document
        .getElementById("app")
        .classList.remove("hidden");
}


/* =========================================================
   AUTH
========================================================= */

function showAuth(type) {

    const login =
        document.getElementById("loginForm");

    const signup =
        document.getElementById("signupForm");

    const loginTab =
        document.getElementById("loginTab");

    const signupTab =
        document.getElementById("signupTab");


    if (type === "login") {

        login.classList.remove("hidden");

        signup.classList.add("hidden");

        loginTab.classList.add("active");

        signupTab.classList.remove("active");

    } else {

        login.classList.add("hidden");

        signup.classList.remove("hidden");

        loginTab.classList.remove("active");

        signupTab.classList.add("active");

    }

    clearMessage("authMessage");
}


async function signup() {

    const name =
        document
            .getElementById("signupName")
            .value
            .trim();

    const email =
        document
            .getElementById("signupEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("signupPassword")
            .value;


    if (!name || !email || !password) {

        showMessage(
            "authMessage",
            "Please fill in everything ♡"
        );

        return;
    }


    if (password.length < 6) {

        showMessage(
            "authMessage",
            "Your password needs at least 6 characters."
        );

        return;
    }


    showMessage(
        "authMessage",
        "Creating your account..."
    );


    const {
        data,
        error
    } =
        await supabaseClient.auth.signUp({

            email,

            password,

            options: {

                data: {
                    display_name: name
                }

            }

        });


    if (error) {

        showMessage(
            "authMessage",
            error.message
        );

        return;
    }


    if (data.session) {

        currentUser = data.user;

        await afterLogin();

    } else {

        showMessage(
            "authMessage",
            "Account created! Check your email if confirmation is enabled."
        );

        showAuth("login");

    }
}


async function login() {

    const email =
        document
            .getElementById("loginEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;


    if (!email || !password) {

        showMessage(
            "authMessage",
            "Enter your email and password."
        );

        return;
    }


    showMessage(
        "authMessage",
        "Opening your little world..."
    );


    const {
        data,
        error
    } =
        await supabaseClient.auth.signInWithPassword({

            email,

            password

        });


    if (error) {

        showMessage(
            "authMessage",
            error.message
        );

        return;
    }


    currentUser = data.user;

    await afterLogin();
}


async function sendPasswordReset() {
    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
        showMessage("authMessage", "Enter your account email first, then tap Forgot your password? ♡");
        document.getElementById("loginEmail").focus();
        return;
    }

    showMessage("authMessage", "Sending your password-reset link...");

    const redirectTo = window.location.origin + window.location.pathname + "?reset-password=1";

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo
    });

    if (error) {
        showMessage("authMessage", "Couldn't send the reset email: " + error.message);
        return;
    }

    showMessage(
        "authMessage",
        "If an account exists for that email, a password-reset link is on its way. Check your inbox and spam folder ♡"
    );
}


async function saveNewPassword() {
    const password = document.getElementById("newPassword").value;
    const confirmation = document.getElementById("confirmNewPassword").value;

    if (!password || !confirmation) {
        showMessage("resetPasswordMessage", "Please fill in both password fields.");
        return;
    }

    if (password.length < 6) {
        showMessage("resetPasswordMessage", "Your password needs at least 6 characters.");
        return;
    }

    if (password !== confirmation) {
        showMessage("resetPasswordMessage", "Those passwords don't match. Try again ♡");
        return;
    }

    showMessage("resetPasswordMessage", "Updating your password...");

    const { error } = await supabaseClient.auth.updateUser({
        password
    });

    if (error) {
        showMessage("resetPasswordMessage", "Couldn't update your password: " + error.message);
        return;
    }

    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
    showMessage("resetPasswordMessage", "Password updated! You can now log in with your new password ♡");

    // Clear the recovery tokens from the address bar after a successful update.
    window.history.replaceState({}, document.title, window.location.pathname);
}


function returnToLogin() {
    window.history.replaceState({}, document.title, window.location.pathname);
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
    showScreen("authScreen");
    showAuth("login");
}


async function logout() {

    if (realtimeChannel) {

        await supabaseClient
            .removeChannel(realtimeChannel);

        realtimeChannel = null;
    }


    if (doodleChannel) {

        await supabaseClient
            .removeChannel(doodleChannel);

        doodleChannel = null;
    }


    await supabaseClient.auth.signOut();

    currentUser = null;

    currentRoom = null;

    showScreen("authScreen");
}


/* =========================================================
   AFTER LOGIN
========================================================= */

async function afterLogin() {

    await loadProfile();

    await findExistingRoom();

}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();


    if (error) {

        console.error(error);

        return;
    }


    currentProfile = data;
}


async function updateProfileName(name) {

    const {
        error
    } =
        await supabaseClient
            .from("profiles")
            .update({
                display_name: name
            })
            .eq("id", currentUser.id);


    if (!error) {

        currentProfile.display_name = name;

    }
}


/* =========================================================
   ROOM
========================================================= */

async function findExistingRoom() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("room_members")
            .select(`
                room_id,
                rooms (
                    id,
                    name,
                    invite_code
                )
            `)
            .eq("user_id", currentUser.id)
            .limit(1);


    if (error) {

        console.error(error);

        showScreen("roomScreen");

        return;
    }


    if (data && data.length > 0) {

        currentRoom = data[0].rooms;

        await enterRoom();

    } else {

        showScreen("roomScreen");

    }
}


async function createRoom() {

    const name =
        document
            .getElementById("newRoomName")
            .value
            .trim()
        || "Our Little Story";


    showMessage(
        "roomMessage",
        "Creating your little world..."
    );


    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "create_room",
            {
                room_name: name
            }
        );


    if (error) {

        showMessage(
            "roomMessage",
            error.message
        );

        return;
    }


    const roomId = data[0].room_id;

    const inviteCode = data[0].invite_code;


    const {
        data: roomData,
        error: roomError
    } =
        await supabaseClient
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();


    if (roomError) {

        showMessage(
            "roomMessage",
            roomError.message
        );

        return;
    }


    currentRoom = roomData;


    alert(
        "Your room is ready!\n\n" +
        "Invite code: " +
        inviteCode +
        "\n\n" +
        "Give this code to your person so they can join."
    );


    await enterRoom();
}


async function joinRoom() {

    const code =
        document
            .getElementById("joinCode")
            .value
            .trim()
            .toUpperCase();


    if (code.length !== 8) {

        showMessage(
            "roomMessage",
            "Your invite code should be 8 characters."
        );

        return;
    }


    showMessage(
        "roomMessage",
        "Joining..."
    );


    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "join_room",
            {
                code
            }
        );


    if (error) {

        showMessage(
            "roomMessage",
            error.message
        );

        return;
    }


    const roomId = data;


    const {
        data: roomData,
        error: roomError
    } =
        await supabaseClient
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();


    if (roomError) {

        showMessage(
            "roomMessage",
            roomError.message
        );

        return;
    }


    currentRoom = roomData;

    await enterRoom();
}


async function enterRoom() {

    document
        .getElementById("roomNameDisplay")
        .textContent =
        currentRoom.name;


    showApp();


    await loadAll();


    setupRealtime();


    navigate("home");
}


function showInviteCode() {

    if (!currentRoom) return;

    alert(
        "Your room invite code is:\n\n" +
        currentRoom.invite_code +
        "\n\n" +
        "Send this code to your person."
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

function navigate(page) {

    if (page !== "screenshots") screenshotsUnlocked = false;
    document
        .querySelectorAll(".page")
        .forEach(section => {
            section.classList.remove("active-page");
        });


    const target =
        document.getElementById(
            "page-" + page
        );


    if (target) {

        target.classList.add("active-page");

    }


    document
        .querySelectorAll(".nav-btn")
        .forEach(btn => {

            btn.classList.toggle(
                "active",
                btn.dataset.page === page
            );

        });


    if (page === "doodle") {

        setTimeout(
            initializeCanvas,
            50
        );

    }

    if (page === "chat") {
        setTimeout(scrollMessagesToBottom, 50);
    }

    if (page === "screenshots" && screenshotsUnlocked) loadScreenshots();
}


/* =========================================================
   LOAD EVERYTHING
========================================================= */

async function loadAll() {

    await Promise.all([
        loadStory(),
        loadMemories(),
        loadJournal(),
        loadCharacters(),
        loadMessages(),
        loadDoodles()
    ]);
}


/* =========================================================
   STORY
========================================================= */

async function loadStory() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("story_sections")
            .select("*")
            .eq("room_id", currentRoom.id)
            .order("story_date", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true });


    if (error) {

        console.error(error);

        return;
    }


    // Keep Our Story in chronological order: oldest chapter first.
    // If a chapter has no story_date, use its creation date as a fallback.
    data.sort((a, b) => {
        const dateA = a.story_date || (a.created_at ? a.created_at.slice(0, 10) : "9999-12-31");
        const dateB = b.story_date || (b.created_at ? b.created_at.slice(0, 10) : "9999-12-31");
        return dateA.localeCompare(dateB);
    });

    const container =
        document.getElementById("storyList");


    if (!data.length) {

        container.innerHTML = emptyState(
            "Your story hasn't been written yet.",
            "Start with how you two met ♡"
        );

        return;
    }


    container.innerHTML =
        data.map(
            (item, index) => `

            <article class="story-card">

                <div class="story-number">
                    ${item.story_date ? formatDate(item.story_date) : (item.created_at ? formatDate(item.created_at.slice(0,10)) : "A LITTLE CHAPTER")}
                </div>

                <h3>
                    ${escapeHTML(item.title)}
                </h3>

                <p>
                    ${escapeHTML(item.content)}
                </p>

                <div class="card-actions">

                    <button
                        class="action-btn"
                        onclick="editStory('${item.id}')"
                    >
                        Edit
                    </button>

                    <button
                        class="action-btn delete"
                        onclick="deleteStory('${item.id}')"
                    >
                        Delete
                    </button>

                </div>

            </article>

        `
        ).join("");
}


function openStoryModal(item = null) {

    editingId = item ? item.id : null;


    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            ${item ? "Edit chapter" : "Add a chapter"}
        </h2>

        <label class="form-label">
            Chapter title
        </label>

        <input
            id="storyTitle"
            type="text"
            value="${item ? escapeAttribute(item.title) : ""}"
            placeholder="The day we met..."
        >

        <label class="form-label">When did this part happen?</label>
        <input id="storyDate" type="date" value="${item?.story_date || (item?.created_at ? item.created_at.slice(0,10) : "")}">

        <label class="form-label">
            Your story
        </label>

        <textarea
            id="storyContent"
            placeholder="Write everything here..."
        >${item ? escapeHTML(item.content) : ""}</textarea>

        <button
            class="primary-btn"
            onclick="saveStory()"
        >
            Save chapter ♡
        </button>

    `;


    openModal();
}


async function editStory(id) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("story_sections")
            .select("*")
            .eq("id", id)
            .single();


    if (!error) {

        openStoryModal(data);

    }
}


async function saveStory() {

    const title =
        document
            .getElementById("storyTitle")
            .value
            .trim();

    const content =
        document
            .getElementById("storyContent")
            .value
            .trim();
    const storyDate = document.getElementById("storyDate").value || null;


    if (!title || !content) {

        showToast(
            "Please fill in the title and story."
        );

        return;
    }


    let error;


    if (editingId) {

        ({
            error
        } =
            await supabaseClient
                .from("story_sections")
                .update({
                    title,
                    content,
                    story_date: storyDate,
                    updated_at: new Date().toISOString()
                })
                .eq("id", editingId));

    } else {

        ({
            error
        } =
            await supabaseClient
                .from("story_sections")
                .insert({
                    room_id: currentRoom.id,
                    title,
                    content,
                    story_date: storyDate,
                    sort_order: 999,
                    created_by: currentUser.id
                }));

    }


    if (error) {

        showToast(error.message);

        return;
    }


    closeModal();

    await loadStory();

    showToast("Chapter saved ♡");
}


async function deleteStory(id) {

    if (
        !confirm(
            "Delete this chapter?"
        )
    ) return;


    const {
        error
    } =
        await supabaseClient
            .from("story_sections")
            .delete()
            .eq("id", id);


    if (error) {

        showToast(error.message);

        return;
    }


    await loadStory();

    showToast("Chapter deleted.");
}


/* =========================================================
   PRIVATE SCREENSHOTS
========================================================= */

function unlockScreenshots() {
    const entered = document.getElementById("screenshotsPassword").value;
    const message = document.getElementById("screenshotsLockMessage");
    if (entered !== SCREENSHOTS_PASSWORD || SCREENSHOTS_PASSWORD === "change-this-password") {
        message.textContent = SCREENSHOTS_PASSWORD === "change-this-password"
            ? "Set your own password in script.js first."
            : "That isn't quite right. Try again ♡";
        return;
    }
    screenshotsUnlocked = true;
    document.getElementById("screenshotsLock").classList.add("hidden");
    document.getElementById("screenshotsContent").classList.remove("hidden");
    loadScreenshots();
}

async function loadScreenshots() {
    if (!screenshotsUnlocked || !currentRoom) return;
    const grid = document.getElementById("screenshotsGrid");
    grid.innerHTML = '<p class="page-subtitle">Gathering our little moments...</p>';
    const { data, error } = await supabaseClient.from("screenshots")
        .select("*").eq("room_id", currentRoom.id).order("created_at", { ascending: false });
    if (error) {
        grid.innerHTML = `<p class="page-subtitle">${escapeHTML(error.message)} — run the screenshots SQL setup first.</p>`;
        return;
    }
    if (!data?.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">♡</div><h3>No screenshots yet</h3><p>Save the first little piece of a conversation here.</p></div>';
        return;
    }
    const cards = await Promise.all(data.map(async item => ({ item, url: await getSignedUrl(item.image_path) })));
    grid.innerHTML = cards.map(({item,url}) => url ? `
        <article class="screenshot-card">
          <button class="screenshot-image-button" type="button" onclick="openPhotoLightbox('${escapeAttribute(url)}','${escapeAttribute(item.caption || "Our screenshot")}')"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(item.caption || "Our screenshot")}"></button>
          <div class="screenshot-card-caption"><p>${escapeHTML(item.caption || "A little piece of us")}</p><button class="action-btn delete" onclick="deleteScreenshot('${item.id}','${escapeAttribute(item.image_path)}')">Remove</button></div>
          <time>${formatDate(item.created_at.slice(0,10))}</time>
        </article>` : "").join("");
}

async function uploadScreenshots(fileList) {
    if (!screenshotsUnlocked) return;
    const files = Array.from(fileList || []).filter(file => file.type.startsWith("image/"));
    for (const file of files) {
        const path = `${currentRoom.id}/screenshots/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabaseClient.storage.from("our-story").upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) { showToast("Upload failed: " + uploadError.message); continue; }
        const { error } = await supabaseClient.from("screenshots").insert({ room_id: currentRoom.id, image_path: path, caption: file.name.replace(/\.[^.]+$/, ""), created_by: currentUser.id });
        if (error) { await deleteStorageFile(path); showToast("Couldn't save screenshot: " + error.message); }
    }
    document.getElementById("screenshotsFiles").value = "";
    await loadScreenshots();
    showToast("Screenshots saved ♡");
}

async function deleteScreenshot(id, path) {
    if (!confirm("Remove this screenshot?")) return;
    const { error } = await supabaseClient.from("screenshots").delete().eq("id", id);
    if (error) { showToast(error.message); return; }
    await deleteStorageFile(path);
    await loadScreenshots();
}


/* =========================================================
   MEMORIES — CHRONOLOGICAL PHOTO SCRAPBOOK
========================================================= */

function getMemoryImagePaths(item) {
    // image_paths is the new multi-photo field. image_path keeps older
    // memories compatible with the original version of the website.
    const paths = Array.isArray(item?.image_paths)
        ? item.image_paths.filter(Boolean)
        : [];

    if (item?.image_path && !paths.includes(item.image_path)) {
        paths.unshift(item.image_path);
    }

    return [...new Set(paths)];
}


async function loadMemories() {
    const { data, error } = await supabaseClient
        .from("memories")
        .select("*")
        .eq("room_id", currentRoom.id)
        .order("memory_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        showToast("Couldn't load memories: " + error.message);
        return;
    }

    const container = document.getElementById("memoryGrid");

    if (!data || !data.length) {
        container.innerHTML = emptyState(
            "Your timeline is waiting for its first memory.",
            "Add a date, a few photos, and a little story ♡"
        );
        return;
    }

    // Show newest memories first, while keeping undated memories at the end.
    data.sort((a, b) => {
        if (!a.memory_date && b.memory_date) return 1;
        if (a.memory_date && !b.memory_date) return -1;
        if (a.memory_date !== b.memory_date) {
            return (b.memory_date || "").localeCompare(a.memory_date || "");
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    const cards = [];

    for (const item of data) {
        const paths = getMemoryImagePaths(item);
        const urls = (await Promise.all(paths.map(getSignedUrl))).filter(Boolean);

        const photos = urls.length
            ? `<div class="memory-photo-grid ${urls.length === 1 ? "one-photo" : ""}">
                ${urls.map((url, index) => `
                    <button class="memory-photo-button" type="button"
                        onclick="openPhotoLightbox('${escapeAttribute(url)}', '${escapeAttribute(item.title)}')"
                        aria-label="Enlarge photo ${index + 1}">
                        <img class="memory-image" src="${escapeAttribute(url)}"
                            alt="${escapeAttribute(item.title)} — photo ${index + 1}" loading="lazy">
                    </button>
                `).join("")}
               </div>`
            : `<button class="memory-no-photo" type="button"
                    onclick="editMemory('${item.id}')">♡<span>Add photos</span></button>`;

        cards.push(`
            <article class="memory-card">
                <div class="memory-timeline-dot" aria-hidden="true"></div>
                ${photos}
                <div class="memory-info">
                    <div class="memory-date">
                        ${item.memory_date ? formatDate(item.memory_date) : "DATE NOT SET"}
                    </div>
                    <h3>${escapeHTML(item.title)}</h3>
                    <p>${escapeHTML(item.caption || "")}</p>
                    ${urls.length > 1 ? `<div class="memory-photo-count">${urls.length} little moments ♡</div>` : ""}
                    <div class="card-actions">
                        <button class="action-btn" onclick="editMemory('${item.id}')">Edit</button>
                        <button class="action-btn delete" onclick="deleteMemory('${item.id}')">Delete</button>
                    </div>
                </div>
            </article>
        `);
    }

    container.innerHTML = cards.join("");
}


async function openMemoryModal(item = null) {
    editingId = item ? item.id : null;
    const existingPaths = item ? getMemoryImagePaths(item) : [];
    const existingPhotos = await Promise.all(existingPaths.map(async path => {
        const url = await getSignedUrl(path);
        return { path, url };
    }));

    document.getElementById("modalContent").innerHTML = `
        <h2>${item ? "Edit memory" : "Add a memory"}</h2>

        <label class="form-label">Photos</label>
        <p class="memory-modal-hint">
            ${item
                ? "Choose extra photos to add to this memory. Your current photos will stay."
                : "Choose as many photos as you like from your computer."}
        </p>
        <input id="memoryFiles" class="file-input" type="file" accept="image/*" multiple>
        ${existingPhotos.length ? `
            <div class="existing-photo-note">
                Current photos — untick nothing; select a photo below to remove it when you save.
            </div>
            <div class="memory-edit-photo-grid">
                ${existingPhotos.map((photo, index) => `
                    <label class="memory-edit-photo">
                        ${photo.url
                            ? `<img src="${escapeAttribute(photo.url)}" alt="Saved memory photo ${index + 1}">`
                            : `<span class="memory-edit-photo-missing">♡</span>`}
                        <span class="memory-remove-choice">
                            <input type="checkbox" name="removeMemoryPhoto"
                                value="${escapeAttribute(photo.path)}">
                            Remove photo
                        </span>
                    </label>
                `).join("")}
            </div>
        ` : ""}

        <label class="form-label">Title</label>
        <input id="memoryTitle" type="text"
            value="${item ? escapeAttribute(item.title) : ""}"
            placeholder="That one beautiful day...">

        <label class="form-label">Date this memory happened</label>
        <input id="memoryDate" type="date" value="${item?.memory_date || ""}">

        <label class="form-label">Caption</label>
        <textarea id="memoryCaption"
            placeholder="Write what happened, why it matters, or what you want to remember...">${item ? escapeHTML(item.caption || "") : ""}</textarea>

        <button class="primary-btn" onclick="saveMemory()">Save memory ♡</button>
    `;

    openModal();
}


async function editMemory(id) {
    const { data, error } = await supabaseClient
        .from("memories")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        showToast(error.message);
        return;
    }

    openMemoryModal(data);
}


async function saveMemory() {
    const title = document.getElementById("memoryTitle").value.trim();
    const date = document.getElementById("memoryDate").value || null;
    const caption = document.getElementById("memoryCaption").value.trim();
    const fileInput = document.getElementById("memoryFiles");
    const files = Array.from(fileInput.files || []);

    if (!title) {
        showToast("Give this memory a title ♡");
        return;
    }

    if (files.some(file => !file.type.startsWith("image/"))) {
        showToast("Please choose image files only.");
        return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (files.some(file => file.size > MAX_FILE_SIZE)) {
        showToast("Each photo must be 10 MB or smaller.");
        return;
    }

    let existingItem = null;
    let imagePaths = [];
    let pathsToRemove = [];

    if (editingId) {
        const { data, error } = await supabaseClient
            .from("memories")
            .select("*")
            .eq("id", editingId)
            .single();

        if (error) {
            showToast(error.message);
            return;
        }

        existingItem = data;
        imagePaths = getMemoryImagePaths(data);
        pathsToRemove = Array.from(
            document.querySelectorAll('input[name="removeMemoryPhoto"]:checked')
        ).map(input => input.value);
        imagePaths = imagePaths.filter(path => !pathsToRemove.includes(path));
    }

    if (!editingId && !files.length) {
        showToast("Choose at least one photo for your memory.");
        return;
    }

    const newlyUploadedPaths = [];

    if (files.length) {
        showToast(`Uploading ${files.length} photo${files.length === 1 ? "" : "s"}...`);

        for (const file of files) {
            const path = `${currentRoom.id}/memories/${crypto.randomUUID()}-${safeFileName(file.name)}`;
            const { error: uploadError } = await supabaseClient
                .storage
                .from("our-story")
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) {
                await Promise.all(newlyUploadedPaths.map(deleteStorageFile));
                showToast("Photo upload failed: " + uploadError.message);
                return;
            }

            newlyUploadedPaths.push(path);
            imagePaths.push(path);
        }
    }

    let error;

    if (editingId) {
        ({ error } = await supabaseClient
            .from("memories")
            .update({
                title,
                memory_date: date,
                caption,
                image_path: imagePaths[0] || null,
                image_paths: imagePaths
            })
            .eq("id", editingId));
    } else {
        ({ error } = await supabaseClient
            .from("memories")
            .insert({
                room_id: currentRoom.id,
                title,
                caption,
                memory_date: date,
                image_path: imagePaths[0] || null,
                image_paths: imagePaths,
                created_by: currentUser.id
            }));
    }

    if (error) {
        await Promise.all(newlyUploadedPaths.map(deleteStorageFile));
        showToast("Couldn't save the memory: " + error.message);
        return;
    }

    if (pathsToRemove.length) {
        await Promise.all(pathsToRemove.map(deleteStorageFile));
    }

    closeModal();
    await loadMemories();
    showToast("Memory saved to your timeline ♡");
}


async function deleteMemory(id) {
    if (!confirm("Delete this memory and all of its photos?")) return;

    const { data: item, error: fetchError } = await supabaseClient
        .from("memories")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError) {
        showToast(fetchError.message);
        return;
    }

    const { error } = await supabaseClient
        .from("memories")
        .delete()
        .eq("id", id);

    if (error) {
        showToast(error.message);
        return;
    }

    await Promise.all(getMemoryImagePaths(item).map(deleteStorageFile));
    await loadMemories();
    showToast("Memory deleted.");
}


function openPhotoLightbox(url, title) {
    const overlay = document.getElementById("photoLightbox");
    const image = document.getElementById("photoLightboxImage");
    const caption = document.getElementById("photoLightboxCaption");
    if (!overlay || !image || !caption) return;

    image.src = url;
    image.alt = title || "Memory photo";
    caption.textContent = title || "";
    overlay.classList.remove("hidden");
    document.body.classList.add("lightbox-open");
}


function closePhotoLightbox(event) {
    if (event && event.target && !event.target.closest(".photo-lightbox-close")
        && event.target.id !== "photoLightbox") return;

    const overlay = document.getElementById("photoLightbox");
    const image = document.getElementById("photoLightboxImage");
    if (overlay) overlay.classList.add("hidden");
    if (image) image.src = "";
    document.body.classList.remove("lightbox-open");
}

/* =========================================================
   JOURNAL
========================================================= */

async function loadJournal() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("journal_entries")
            .select("*")
            .eq("room_id", currentRoom.id)
            .order("entry_date", {
                ascending: false
            })
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(error);

        return;
    }


    const container =
        document.getElementById(
            "journalList"
        );


    if (!data.length) {

        container.innerHTML =
            emptyState(
                "The journal is still empty.",
                "Write the first little entry ♡"
            );

        return;
    }


    container.innerHTML =
        data.map(
            item => `

            <article class="journal-card">

                <div class="journal-date">
                    ${formatDate(item.entry_date)}
                </div>

                <h3>
                    ${escapeHTML(item.title)}
                </h3>

                <div class="journal-content">
                    ${escapeHTML(item.content)}
                </div>

                <div class="card-actions">

                    <button
                        class="action-btn"
                        onclick="editJournal('${item.id}')"
                    >
                        Edit
                    </button>

                    <button
                        class="action-btn delete"
                        onclick="deleteJournal('${item.id}')"
                    >
                        Delete
                    </button>

                </div>

            </article>

        `
        ).join("");
}


function openJournalModal(item = null) {

    editingId = item ? item.id : null;


    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            ${item ? "Edit entry" : "New journal entry"}
        </h2>

        <label class="form-label">
            Date
        </label>

        <input
            id="journalDate"
            type="date"
            value="${
                item?.entry_date
                ||
                new Date()
                    .toISOString()
                    .slice(0,10)
            }"
        >

        <label class="form-label">
            Title
        </label>

        <input
            id="journalTitle"
            type="text"
            value="${item ? escapeAttribute(item.title) : ""}"
            placeholder="Today..."
        >

        <label class="form-label">
            Entry
        </label>

        <textarea
            id="journalContent"
            placeholder="Dear diary..."
        >${item ? escapeHTML(item.content) : ""}</textarea>

        <button
            class="primary-btn"
            onclick="saveJournal()"
        >
            Save entry ♡
        </button>

    `;


    openModal();
}


async function editJournal(id) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("journal_entries")
            .select("*")
            .eq("id", id)
            .single();


    if (!error) {

        openJournalModal(data);

    }
}


async function saveJournal() {

    const title =
        document
            .getElementById("journalTitle")
            .value
            .trim();

    const content =
        document
            .getElementById("journalContent")
            .value
            .trim();

    const date =
        document
            .getElementById("journalDate")
            .value;


    if (!title || !content) {

        showToast(
            "Write something first ♡"
        );

        return;
    }


    let error;


    if (editingId) {

        ({
            error
        } =
            await supabaseClient
                .from("journal_entries")
                .update({
                    title,
                    content,
                    entry_date: date,
                    updated_at:
                        new Date().toISOString()
                })
                .eq("id", editingId));

    } else {

        ({
            error
        } =
            await supabaseClient
                .from("journal_entries")
                .insert({

                    room_id:
                        currentRoom.id,

                    title,

                    content,

                    entry_date:
                        date,

                    created_by:
                        currentUser.id

                }));

    }


    if (error) {

        showToast(error.message);

        return;
    }


    closeModal();

    await loadJournal();

    showToast("Journal entry saved ♡");
}


async function deleteJournal(id) {

    if (
        !confirm(
            "Delete this journal entry?"
        )
    ) return;


    const {
        error
    } =
        await supabaseClient
            .from("journal_entries")
            .delete()
            .eq("id", id);


    if (error) {

        showToast(error.message);

        return;
    }


    await loadJournal();

    showToast("Entry deleted.");
}


/* =========================================================
   CHARACTERS
========================================================= */

async function loadCharacters() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("characters")
            .select("*")
            .eq("room_id", currentRoom.id)
            .order("created_at", {
                ascending: true
            });


    if (error) {

        console.error(error);

        return;
    }


    const container =
        document.getElementById(
            "characterGrid"
        );


    if (!data.length) {

        container.innerHTML =
            emptyState(
                "No characters yet.",
                "Obviously you two should be here first ♡"
            );

        return;
    }


    const cards = [];


    for (const item of data) {

        let imageHTML = "";


        if (item.image_path) {

            const url =
                await getSignedUrl(
                    item.image_path
                );


            if (url) {

                imageHTML = `

                    <img
                        class="character-image"
                        src="${url}"
                        alt="${escapeAttribute(item.name)}"
                    >

                `;

            }

        }


        if (!imageHTML) {

            imageHTML = `

                <div class="character-placeholder">
                    ♡
                </div>

            `;

        }


        cards.push(`

            <article class="character-card">

                ${imageHTML}

                <div class="character-info">

                    <div class="character-role">
                        ${escapeHTML(item.role)}
                    </div>

                    <h3>
                        ${escapeHTML(item.name)}
                    </h3>

                    <p>
                        ${escapeHTML(item.description)}
                    </p>

                    ${
                        item.favorite
                        ?
                        `
                        <div class="favorite-box">
                            ♡ ${escapeHTML(item.favorite)}
                        </div>
                        `
                        :
                        ""
                    }

                    <div class="card-actions">

                        <button
                            class="action-btn"
                            onclick="editCharacter('${item.id}')"
                        >
                            Edit
                        </button>

                        <button
                            class="action-btn delete"
                            onclick="deleteCharacter('${item.id}')"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            </article>

        `);

    }


    container.innerHTML =
        cards.join("");
}


function openCharacterModal(item = null) {

    editingId = item ? item.id : null;


    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            ${item ? "Edit character" : "Add character"}
        </h2>

        ${
            item
            ?
            ""
            :
            `
            <label class="form-label">
                Photo
            </label>

            <input
                id="characterFile"
                class="file-input"
                type="file"
                accept="image/*"
            >
            `
        }

        <label class="form-label">
            Name
        </label>

        <input
            id="characterName"
            type="text"
            value="${item ? escapeAttribute(item.name) : ""}"
            placeholder="Name"
        >

        <label class="form-label">
            Role
        </label>

        <input
            id="characterRole"
            type="text"
            value="${item ? escapeAttribute(item.role) : ""}"
            placeholder="Girlfriend, boyfriend, best friend..."
        >

        <label class="form-label">
            Description
        </label>

        <textarea
            id="characterDescription"
            placeholder="Tell us about them..."
        >${item ? escapeHTML(item.description) : ""}</textarea>

        <label class="form-label">
            Favorite things
        </label>

        <input
            id="characterFavorite"
            type="text"
            value="${item ? escapeAttribute(item.favorite) : ""}"
            placeholder="Favorite food, song, habit..."
        >

        <button
            class="primary-btn"
            onclick="saveCharacter()"
        >
            Save character ♡
        </button>

    `;


    openModal();
}


async function editCharacter(id) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("characters")
            .select("*")
            .eq("id", id)
            .single();


    if (!error) {

        openCharacterModal(data);

    }
}


async function saveCharacter() {

    const name =
        document
            .getElementById("characterName")
            .value
            .trim();

    const role =
        document
            .getElementById("characterRole")
            .value
            .trim();

    const description =
        document
            .getElementById("characterDescription")
            .value
            .trim();

    const favorite =
        document
            .getElementById("characterFavorite")
            .value
            .trim();


    if (!name) {

        showToast(
            "Give your character a name."
        );

        return;
    }


    if (editingId) {

        const {
            error
        } =
            await supabaseClient
                .from("characters")
                .update({
                    name,
                    role,
                    description,
                    favorite
                })
                .eq("id", editingId);


        if (error) {

            showToast(error.message);

            return;
        }

    } else {

        const fileInput =
            document.getElementById(
                "characterFile"
            );

        const file =
            fileInput.files[0];

        let imagePath = null;


        if (file) {

            const path =
                `${currentRoom.id}/characters/${crypto.randomUUID()}-${safeFileName(file.name)}`;


            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from("our-story")
                    .upload(
                        path,
                        file,
                        {
                            cacheControl: "3600",
                            upsert: false
                        }
                    );


            if (uploadError) {

                showToast(
                    uploadError.message
                );

                return;
            }


            imagePath = path;

        }


        const {
            error
        } =
            await supabaseClient
                .from("characters")
                .insert({

                    room_id:
                        currentRoom.id,

                    name,

                    role,

                    description,

                    favorite,

                    image_path:
                        imagePath,

                    created_by:
                        currentUser.id

                });


        if (error) {

            if (imagePath) {

                await deleteStorageFile(
                    imagePath
                );

            }

            showToast(error.message);

            return;
        }

    }


    closeModal();

    await loadCharacters();

    showToast("Character saved ♡");
}


async function deleteCharacter(id) {

    if (
        !confirm(
            "Delete this character?"
        )
    ) return;


    const {
        data
    } =
        await supabaseClient
            .from("characters")
            .select("image_path")
            .eq("id", id)
            .single();


    const {
        error
    } =
        await supabaseClient
            .from("characters")
            .delete()
            .eq("id", id);


    if (error) {

        showToast(error.message);

        return;
    }


    if (data?.image_path) {

        await deleteStorageFile(
            data.image_path
        );

    }


    await loadCharacters();

    showToast("Character deleted.");
}


/* =========================================================
   CHAT
========================================================= */

async function loadMessages() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("messages")
            .select("*")
            .eq("room_id", currentRoom.id)
            .order("created_at", {
                ascending: true
            });


    if (error) {

        console.error(error);

        return;
    }


    renderMessages(data);
}


function renderMessages(messages) {

    const container =
        document.getElementById(
            "messages"
        );


    container.innerHTML =
        messages.map(
            message => {

                const mine =
                    message.sender_id ===
                    currentUser.id;


                return `

                    <div
                        class="message-row ${mine ? "mine" : ""}"
                    >

                        <div class="chat-bubble">

                            ${
                                !mine
                                ?
                                `
                                <div class="chat-sender">
                                    ${escapeHTML(message.sender_name)}
                                </div>
                                `
                                :
                                ""
                            }

                            <div>
                                ${escapeHTML(message.content)}
                            </div>

                            <div class="chat-time">
                                ${formatTime(message.created_at)}
                            </div>

                        </div>

                    </div>

                `;

            }
        ).join("");


    scrollMessagesToBottom();
}


async function sendMessage(event) {

    event.preventDefault();


    const input =
        document.getElementById(
            "messageInput"
        );


    const content =
        input.value.trim();


    if (!content) return;


    input.value = "";


    const {
        error
    } =
        await supabaseClient
            .from("messages")
            .insert({

                room_id:
                    currentRoom.id,

                sender_id:
                    currentUser.id,

                sender_name:
                    currentProfile?.display_name
                    || "Someone",

                content

            });


    if (error) {

        showToast(
            error.message
        );

        input.value = content;

    }
}


function scrollMessagesToBottom() {

    const container =
        document.getElementById(
            "messages"
        );


    if (container) {

        container.scrollTop =
            container.scrollHeight;

    }
}


/* =========================================================
   DOODLE CANVAS
========================================================= */

function initializeCanvas() {

    canvas =
        document.getElementById(
            "doodleCanvas"
        );

    if (!canvas) return;


    const rect =
        canvas.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio || 1;


    canvasWidth =
        rect.width;

    canvasHeight =
        rect.height;


    canvas.width =
        rect.width * dpr;

    canvas.height =
        rect.height * dpr;


    ctx =
        canvas.getContext("2d");


    ctx.scale(dpr, dpr);

    ctx.lineCap = "round";

    ctx.lineJoin = "round";


    canvas.onpointerdown =
        startDrawing;

    canvas.onpointermove =
        draw;

    canvas.onpointerup =
        finishDrawing;

    canvas.onpointercancel =
        finishDrawing;

    canvas.onpointerleave =
        finishDrawing;


    redrawDoodle();
}


function getCanvasPosition(event) {

    const rect =
        canvas.getBoundingClientRect();


    return {

        x:
            event.clientX -
            rect.left,

        y:
            event.clientY -
            rect.top

    };
}


function startDrawing(event) {

    if (!canvas) return;


    isDrawing = true;

    currentStroke = [];


    const point =
        getCanvasPosition(event);


    currentStroke.push(point);


    ctx.beginPath();

    ctx.moveTo(
        point.x,
        point.y
    );

    event.preventDefault();
}


function draw(event) {

    if (!isDrawing) return;


    const point =
        getCanvasPosition(event);


    currentStroke.push(point);


    ctx.strokeStyle =
        currentTool === "eraser"
        ?
        "#fffdf9"
        :
        currentBrushColor;


    ctx.lineWidth =
        currentBrushSize;


    ctx.lineTo(
        point.x,
        point.y
    );

    ctx.stroke();


    event.preventDefault();
}


async function finishDrawing() {

    if (!isDrawing) return;


    isDrawing = false;


    if (
        currentStroke.length < 2
    ) {

        currentStroke = [];

        return;
    }


    const savedStroke = {

        room_id:
            currentRoom.id,

        user_id:
            currentUser.id,

        color:
            currentBrushColor,

        brush_size:
            currentBrushSize,

        tool:
            currentTool,

        points:
            currentStroke

    };


    const {
        error
    } =
        await supabaseClient
            .from("doodle_strokes")
            .insert(
                savedStroke
            );


    if (error) {

        console.error(error);

        showToast(
            "Couldn't save the drawing."
        );

    }


    currentStroke = [];
}


async function loadDoodles() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("doodle_strokes")
            .select("*")
            .eq("room_id", currentRoom.id)
            .order("created_at", {
                ascending: true
            });


    if (error) {

        console.error(error);

        return;
    }


    window.loadedDoodles =
        data || [];


    redrawDoodle();
}


function redrawDoodle() {

    if (!canvas || !ctx) return;


    ctx.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );


    const strokes =
        window.loadedDoodles || [];


    if (!strokes.length) {

        document
            .getElementById(
                "canvasEmpty"
            )
            ?.classList.remove("hidden");

    } else {

        document
            .getElementById(
                "canvasEmpty"
            )
            ?.classList.add("hidden");

    }


    for (const stroke of strokes) {

        drawStoredStroke(stroke);

    }
}


function drawStoredStroke(stroke) {

    if (
        !stroke.points ||
        stroke.points.length < 2
    ) return;


    ctx.beginPath();


    const first =
        stroke.points[0];


    ctx.moveTo(
        first.x,
        first.y
    );


    for (
        let i = 1;
        i < stroke.points.length;
        i++
    ) {

        const point =
            stroke.points[i];


        ctx.lineTo(
            point.x,
            point.y
        );

    }


    ctx.strokeStyle =
        stroke.tool === "eraser"
        ?
        "#fffdf9"
        :
        stroke.color;


    ctx.lineWidth =
        stroke.brush_size;


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";


    ctx.stroke();
}


function setBrushColor(color) {

    currentBrushColor =
        color;


    document
        .querySelectorAll(".color-dot")
        .forEach(dot => {

            dot.classList.toggle(
                "active",
                dot.dataset.color === color
            );

        });


    setTool("brush");
}


function updateBrushSize(size) {

    currentBrushSize =
        Number(size);


    document
        .getElementById(
            "brushSizeLabel"
        )
        .textContent =
        size + "px";
}


function setTool(tool) {

    currentTool =
        tool;


    document
        .getElementById(
            "brushBtn"
        )
        .classList.toggle(
            "active",
            tool === "brush"
        );


    document
        .getElementById(
            "eraserBtn"
        )
        .classList.toggle(
            "active",
            tool === "eraser"
        );
}


async function clearDoodle() {

    if (
        !confirm(
            "Clear the whole canvas for both of you?"
        )
    ) return;


    const {
        error
    } =
        await supabaseClient
            .from("doodle_strokes")
            .delete()
            .eq(
                "room_id",
                currentRoom.id
            );


    if (error) {

        showToast(
            error.message
        );

        return;
    }


    window.loadedDoodles = [];

    redrawDoodle();
}


/* =========================================================
   REALTIME
========================================================= */

function setupRealtime() {

    if (realtimeChannel) {

        supabaseClient
            .removeChannel(
                realtimeChannel
            );

    }


    if (doodleChannel) {

        supabaseClient
            .removeChannel(
                doodleChannel
            );

    }


    realtimeChannel =
        supabaseClient
            .channel(
                "room-" +
                currentRoom.id
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages",
                    filter:
                        `room_id=eq.${currentRoom.id}`
                },
                async () => {

                    await loadMessages();

                }
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "story_sections",
                    filter:
                        `room_id=eq.${currentRoom.id}`
                },
                async () => {

                    await loadStory();

                }
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "memories",
                    filter:
                        `room_id=eq.${currentRoom.id}`
                },
                async () => {

                    await loadMemories();

                }
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "journal_entries",
                    filter:
                        `room_id=eq.${currentRoom.id}`
                },
                async () => {

                    await loadJournal();

                }
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "characters",
                    filter:
                        `room_id=eq.${currentRoom.id}`
                },
                async () => {

                    await loadCharacters();

                }
            )


            .subscribe();


    doodleChannel =
        supabaseClient
            .channel(
                "doodle-" +
                currentRoom.id
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "doodle_strokes",
                    filter:
                        `room_id=eq.${currentRoom.id}`
                },
                async () => {

                    await loadDoodles();

                }
            )


            .subscribe();

}


/* =========================================================
   STORAGE
========================================================= */

async function getSignedUrl(path) {

    if (!path) return null;


    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from("our-story")
            .createSignedUrl(
                path,
                60 * 60
            );


    if (error) {

        console.error(error);

        return null;
    }


    return data.signedUrl;
}


async function deleteStorageFile(path) {

    if (!path) return;


    const {
        error
    } =
        await supabaseClient
            .storage
            .from("our-story")
            .remove([
                path
            ]);


    if (error) {

        console.error(
            "Storage deletion error:",
            error
        );

    }
}


/* =========================================================
   MODALS
========================================================= */

function openModal() {

    document
        .getElementById(
            "modalOverlay"
        )
        .classList.remove("hidden");
}


function closeModal() {

    document
        .getElementById(
            "modalOverlay"
        )
        .classList.add("hidden");


    editingId = null;
}


function closeModalOnOverlay(event) {

    if (
        event.target.id ===
        "modalOverlay"
    ) {

        closeModal();

    }
}


/* =========================================================
   HELPERS
========================================================= */

function showMessage(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            message;

    }
}


function clearMessage(
    elementId
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent = "";

    }
}


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );
}


function emptyState(
    title,
    subtitle
) {

    return `

        <div
            style="
                grid-column:1/-1;
                text-align:center;
                padding:70px 20px;
                color:#877d88;
            "
        >

            <div
                style="
                    font-size:40px;
                    color:#a88caf;
                    margin-bottom:10px;
                "
            >
                ♡
            </div>

            <h3
                style="
                    color:#3f3151;
                    margin:0 0 5px;
                "
            >
                ${escapeHTML(title)}
            </h3>

            <p>
                ${escapeHTML(subtitle)}
            </p>

        </div>

    `;
}


function formatDate(date) {

    if (!date) return "";

    const d =
        new Date(
            date + "T00:00:00"
        );


    return d.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


function formatTime(date) {

    return new Date(
        date
    ).toLocaleTimeString(
        undefined,
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function safeFileName(name) {

    return name
        .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        )
        .slice(0, 100);
}


function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return escapeHTML(value);
}


/* =========================================================
   RESIZE CANVAS
========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (
            document
                .getElementById(
                    "page-doodle"
                )
                ?.classList.contains(
                    "active-page"
                )
        ) {

            initializeCanvas();

        }

    }
);

/* Close the enlarged photo with Escape */
document.addEventListener("keydown", function photoLightboxEscapeHandler(event) {
    if (event.key === "Escape") {
        const overlay = document.getElementById("photoLightbox");
        if (overlay && !overlay.classList.contains("hidden")) {
            closePhotoLightbox();
        }
    }
});


/* =========================================================
   DARK / LIGHT APPEARANCE
========================================================= */
function applySavedTheme() {
    const savedTheme = localStorage.getItem("ourStoryTheme") || "dark";
    document.body.classList.toggle("dark-theme", savedTheme === "dark");
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
        toggle.textContent = savedTheme === "dark" ? "☀ Light mode" : "☾ Dark mode";
        toggle.setAttribute("aria-label", savedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
}

function toggleTheme() {
    const makeDark = !document.body.classList.contains("dark-theme");
    document.body.classList.toggle("dark-theme", makeDark);
    localStorage.setItem("ourStoryTheme", makeDark ? "dark" : "light");
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
        toggle.textContent = makeDark ? "☀ Light mode" : "☾ Dark mode";
        toggle.setAttribute("aria-label", makeDark ? "Switch to light mode" : "Switch to dark mode");
    }
}

document.addEventListener("DOMContentLoaded", applySavedTheme);
