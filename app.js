// js/app.js

(() => {

    // Create frame objects
    const FRAMES = FRAME_IDS.map(id => ({
        id,
        normal: `frames/${id}.png`
    }));

    // State
    let currentFrame = FRAMES.find(f => f.id === START_CONFIG.frameId) || FRAMES[0];
    let usePP = START_CONFIG.usePP;
    let ppColor = PP_COLORS[START_CONFIG.ppColorIndex].hex;
    let currentCategory = 'all';

    let originalPhoto = null;
    let photo = null;
    let photoWasRotated = false;

    // DOM elements
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d");
    const frameList = document.getElementById("frameList");
    const rightArea = document.getElementById("rightArea");
    const fileInput = document.getElementById("fileInput");
    const takePhotoBtn = document.getElementById("takePhotoBtn");
    const chooseImageBtn = document.getElementById("chooseImageBtn");
    const cameraModal = document.getElementById("cameraModal");
    const cameraPreview = document.getElementById("cameraPreview");
    const captureCanvas = document.getElementById("captureCanvas");
    const captureBtn = document.getElementById("captureBtn");
    const closeCamera = document.getElementById("closeCamera");

    const frameImg = new Image();
    frameImg.src = currentFrame.normal;

    let cameraStream = null;

    /* ======================
       HELPER FUNCTIONS
    ====================== */

    function getFrameWidth(frameId) {
        if (FRAME_SERIES[frameId]) {
            return FRAME_SERIES[frameId];
        }
        const match = frameId.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 36;
    }

    function getCategoryFromFrameId(frameId) {
        const prefix = frameId.split('-')[0];
        return CATEGORY_PREFIXES[prefix] || null;
    }

    function filterFramesByCategory(category) {
        if (category === 'all') return FRAME_IDS;
        
        return FRAME_IDS.filter(frameId => {
            const frameCategory = getCategoryFromFrameId(frameId);
            return frameCategory === category;
        });
    }

    function getScaleFactor(photoWidth, photoHeight, frameWidth) {
        const ratio = photoWidth / photoHeight;
        const ratioKey = Object.keys(SCALE_FACTORS)
            .map(k => parseFloat(k))
            .reduce((prev, curr) => 
                Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev
            );
        
        const ratioStr = ratioKey.toFixed(3);
        const factors = SCALE_FACTORS[ratioStr] || SCALE_FACTORS['0.667'];
        
        const availableWidths = Object.keys(factors).map(k => parseInt(k));
        const matchedWidth = availableWidths.reduce((prev, curr) =>
            Math.abs(curr - frameWidth) < Math.abs(prev - frameWidth) ? curr : prev
        );
        
        return factors[matchedWidth] || 0.93;
    }

    /* ======================
       CAMERA FUNCTIONALITY
    ====================== */

    takePhotoBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await openCamera();
    });

    chooseImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    async function openCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            cameraPreview.srcObject = cameraStream;
            cameraModal.classList.add('active');

        } catch (error) {
            console.error('Camera access error:', error);
            alert('Could not access camera. Please check permissions.');
        }
    }

    function closeModalAndStopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraPreview.srcObject = null;
        cameraModal.classList.remove('active');
    }

    closeCamera.addEventListener('click', closeModalAndStopCamera);

    cameraModal.addEventListener('click', (e) => {
        if (e.target === cameraModal) {
            closeModalAndStopCamera();
        }
    });

    captureBtn.addEventListener('click', () => {
        captureCanvas.width = cameraPreview.videoWidth;
        captureCanvas.height = cameraPreview.videoHeight;

        const captureCtx = captureCanvas.getContext('2d');
        captureCtx.drawImage(cameraPreview, 0, 0);

        captureCanvas.toBlob((blob) => {
            const img = new Image();
            img.onload = () => {
                processImage(img);
                closeModalAndStopCamera();
            };
            img.src = URL.createObjectURL(blob);
        }, 'image/jpeg', 0.95);
    });

    /* ======================
       FILE UPLOAD
    ====================== */

    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            processImage(img);
        };
        img.src = URL.createObjectURL(file);
    };

    /* ======================
       CATEGORY BUTTONS
    ====================== */

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            
            document.querySelectorAll('.category-btn').forEach(b => 
                b.classList.remove('active')
            );
            btn.classList.add('active');
            
            renderFrameList();
        });
    });

    /* ======================
       RENDER FRAME LIST
    ====================== */

    function renderFrameList() {
        frameList.innerHTML = '';
        
        const filteredFrames = filterFramesByCategory(currentCategory);
        
        filteredFrames.forEach(frameId => {
            const f = FRAMES.find(frame => frame.id === frameId);
            if (!f) return;
            
            const row = document.createElement("div");
            row.className = "frameRow";

            const img = document.createElement("img");
            img.src = f.normal;
            img.className = "thumb";
            if (currentFrame.id === f.id) {
                img.classList.add("selected");
            }

            const ppBtn = document.createElement("div");
            ppBtn.className = "ppSmall";
            if (currentFrame.id === f.id && usePP) {
                ppBtn.classList.add("active");
            }

            const colorPicker = document.createElement("div");
            colorPicker.className = "colorPicker";
            if (currentFrame.id === f.id && usePP) {
                colorPicker.classList.add("show");
            }

            PP_COLORS.forEach((color) => {
                const swatch = document.createElement("div");
                swatch.className = "colorSwatch";
                if (ppColor === color.hex && currentFrame.id === f.id && usePP) {
                    swatch.classList.add("selected");
                }
                swatch.style.background = color.hex;
                swatch.title = color.name;

                swatch.onclick = () => {
                    ppColor = color.hex;
                    colorPicker.querySelectorAll(".colorSwatch").forEach(s => 
                        s.classList.remove("selected")
                    );
                    swatch.classList.add("selected");
                    renderFinal();
                };

                colorPicker.appendChild(swatch);
            });

            img.onclick = () => {
                usePP = false;
                currentFrame = f;
                frameImg.src = f.normal;

                renderFrameList();
                resizeCanvas();
                renderFinal();
            };

            ppBtn.onclick = () => {
                if (usePP && currentFrame.id === f.id) {
                    usePP = false;
                } else {
                    usePP = true;
                    currentFrame = f;
                    frameImg.src = f.normal;
                }

                renderFrameList();
                resizeCanvas();
                renderFinal();
            };

            row.appendChild(img);
            row.appendChild(ppBtn);
            frameList.appendChild(row);
            frameList.appendChild(colorPicker);
        });
    }

    /* ======================
       START IMAGE
    ====================== */

    function loadStartImage() {
        const img = new Image();
        img.onload = () => {
            processImage(img);
        };
        img.src = START_CONFIG.image;
    }

    window.addEventListener('load', () => {
        renderFrameList();
        loadStartImage();
    });

    /* ======================
       IMAGE PROCESSING
    ====================== */

    function processImage(img) {
        originalPhoto = img;

        if (img.width > img.height) {
            photoWasRotated = true;

            const temp = document.createElement("canvas");
            temp.width = img.height;
            temp.height = img.width;

            const tctx = temp.getContext("2d");
            tctx.translate(temp.width / 2, temp.height / 2);
            tctx.rotate(-Math.PI / 2);
            tctx.drawImage(img, -img.width / 2, -img.height / 2);

            photo = temp;
        } else {
            photoWasRotated = false;
            photo = img;
        }

        resizeCanvas();
        renderFinal();
    }

    /* ======================
       CANVAS SIZE
    ====================== */

    function resizeCanvas() {
        if (!photo) return;

        const maxW = rightArea.clientWidth * 0.85;
        const maxH = rightArea.clientHeight * 0.85;

        let fullW, fullH;

        if (usePP) {
            const ppBorder = Math.round(Math.min(photo.width, photo.height) * 0.20);
            fullW = photo.width + 2 * ppBorder;
            fullH = photo.height + 2 * ppBorder;
        } else {
            fullW = photo.width;
            fullH = photo.height;
        }

        const scale = Math.min(maxW / fullW, maxH / fullH);

        canvas.width = fullW * scale;
        canvas.height = fullH * scale;
    }

    /* ======================
       RENDERING
    ====================== */

    function renderInternal(targetCtx, displayW, displayH) {
        let fullW, fullH, ppBorder;
        let scaledPhotoW, scaledPhotoH, photoX, photoY;

        if (usePP) {
            ppBorder = Math.round(Math.min(photo.width, photo.height) * 0.20);
            fullW = photo.width + 2 * ppBorder;
            fullH = photo.height + 2 * ppBorder;

            scaledPhotoW = photo.width;
            scaledPhotoH = photo.height;
            photoX = ppBorder;
            photoY = ppBorder;
        } else {
            const frameWidth = getFrameWidth(currentFrame.id);
            const scaleFactor = getScaleFactor(photo.width, photo.height, frameWidth);

            scaledPhotoW = photo.width * scaleFactor;
            scaledPhotoH = photo.height * scaleFactor;

            fullW = photo.width;
            fullH = photo.height;

            photoX = (fullW - scaledPhotoW) / 2;
            photoY = (fullH - scaledPhotoH) / 2;
        }

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = fullW;
        tempCanvas.height = fullH;
        const tempCtx = tempCanvas.getContext("2d");

        if (usePP) {
            tempCtx.fillStyle = ppColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        tempCtx.drawImage(photo, photoX, photoY, scaledPhotoW, scaledPhotoH);
        tempCtx.drawImage(frameImg, 0, 0, fullW, fullH);

        targetCtx.clearRect(0, 0, displayW, displayH);
        targetCtx.drawImage(tempCanvas, 0, 0, displayW, displayH);
    }

    function renderFinal() {
        if (!photo) return;

        resizeCanvas();

        const cw = canvas.width;
        const ch = canvas.height;

        if (!photoWasRotated) {
            renderInternal(ctx, cw, ch);
            return;
        }

        const temp = document.createElement("canvas");
        temp.width = cw;
        temp.height = ch;
        const tctx = temp.getContext("2d");

        renderInternal(tctx, cw, ch);

        canvas.width = ch;
        canvas.height = cw;

        const final = canvas.getContext("2d");

        final.save();
        final.translate(canvas.width / 2, canvas.height / 2);
        final.rotate(Math.PI / 2);
        final.drawImage(temp, -cw / 2, -ch / 2);
        final.restore();
    }

})();