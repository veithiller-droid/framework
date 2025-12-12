// js/app.js - KOMPLETT OHNE ZOOM, NUR EINFACHES CROP

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
    const uploadIcon = document.getElementById("uploadIcon");
    const fileInput = document.getElementById("fileInput");
    const takePhotoBtn = document.getElementById("takePhotoBtn");
    const chooseImageBtn = document.getElementById("chooseImageBtn");
    const cameraModal = document.getElementById("cameraModal");
    const cameraPreview = document.getElementById("cameraPreview");
    const captureCanvas = document.getElementById("captureCanvas");
    const captureBtn = document.getElementById("captureBtn");
    const closeCamera = document.getElementById("closeCamera");

    // Crop modal elements
    const cropModal = document.getElementById("cropModal");
    const cropCanvas = document.getElementById("cropCanvas");
    const cropBox = document.getElementById("cropBox");
    const closeCrop = document.getElementById("closeCrop");
    const cancelCrop = document.getElementById("cancelCrop");
    const applyCrop = document.getElementById("applyCrop");

    const frameImg = new Image();
    frameImg.src = currentFrame.normal;

    let cameraStream = null;

    // Crop state
    let cropState = {
        image: null,
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        startX: 0,
        startY: 0,
        cropX: 0,
        cropY: 0,
        cropWidth: 0,
        cropHeight: 0
    };

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
       UPLOAD MENU
    ====================== */

    uploadIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadIcon.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!uploadIcon.contains(e.target)) {
            uploadIcon.classList.remove('open');
        }
    });

    takePhotoBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        uploadIcon.classList.remove('open');
        await openCamera();
    });

    chooseImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadIcon.classList.remove('open');
        fileInput.click();
    });

    /* ======================
       CAMERA FUNCTIONALITY
    ====================== */

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
                closeModalAndStopCamera();
                openCropModal(img);
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
            openCropModal(img);
        };
        img.src = URL.createObjectURL(file);
    };

    /* ======================
       CROP MODAL
    ====================== */

    function openCropModal(img) {
        cropState.image = img;
        
        // Canvas auf Bildgröße anpassen (mit max constraints)
        const maxWidth = Math.min(800, window.innerWidth * 0.8);
        const maxHeight = Math.min(600, window.innerHeight * 0.6);
        
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
        
        cropCanvas.width = img.width * scale;
        cropCanvas.height = img.height * scale;
        
        // Crop-Box initialisieren (80% vom Canvas, zentriert)
        const boxSize = Math.min(cropCanvas.width, cropCanvas.height) * 0.8;
        cropState.cropWidth = boxSize;
        cropState.cropHeight = boxSize;
        cropState.cropX = (cropCanvas.width - boxSize) / 2;
        cropState.cropY = (cropCanvas.height - boxSize) / 2;
        
        drawCrop();
        updateCropBox();
        
        cropModal.classList.add('active');
    }

    function drawCrop() {
        const ctx = cropCanvas.getContext('2d');
        ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        
        const img = cropState.image;
        
        // Bild 1:1 auf Canvas zeichnen (Canvas ist bereits richtig skaliert)
        ctx.drawImage(img, 0, 0, cropCanvas.width, cropCanvas.height);
    }

    function updateCropBox() {
    const rect = cropCanvas.getBoundingClientRect();
    const containerRect = cropCanvas.parentElement.getBoundingClientRect();
    
    const offsetX = rect.left - containerRect.left;
    const offsetY = rect.top - containerRect.top;
    
    cropBox.style.left = (offsetX + cropState.cropX) + 'px';
    cropBox.style.top = (offsetY + cropState.cropY) + 'px';
    cropBox.style.width = cropState.cropWidth + 'px';
    cropBox.style.height = cropState.cropHeight + 'px';
}

    // Crop box dragging
    cropBox.addEventListener('mousedown', startDrag);
    cropBox.addEventListener('touchstart', startDrag);

    function startDrag(e) {
        if (e.target.classList.contains('crop-handle')) {
            cropState.isResizing = true;
            cropState.resizeHandle = e.target.classList[1]; // nw, ne, sw, se
        } else {
            cropState.isDragging = true;
        }
        
        const point = getEventPoint(e);
        cropState.startX = point.x - cropState.cropX;
        cropState.startY = point.y - cropState.cropY;
        
        e.preventDefault();
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);

    function handleMove(e) {
        if (!cropState.isDragging && !cropState.isResizing) return;
        
        const point = getEventPoint(e);
        
        if (cropState.isDragging) {
            cropState.cropX = Math.max(0, Math.min(cropCanvas.width - cropState.cropWidth, point.x - cropState.startX));
            cropState.cropY = Math.max(0, Math.min(cropCanvas.height - cropState.cropHeight, point.y - cropState.startY));
            updateCropBox();
        } else if (cropState.isResizing) {
            resizeCropBox(point);
        }
        
        e.preventDefault();
    }

    document.addEventListener('mouseup', stopDragResize);
    document.addEventListener('touchend', stopDragResize);

    function stopDragResize() {
        cropState.isDragging = false;
        cropState.isResizing = false;
        cropState.resizeHandle = null;
    }

    function resizeCropBox(point) {
        const handle = cropState.resizeHandle;
        const minSize = 50;
        
        if (handle === 'se') {
            cropState.cropWidth = Math.max(minSize, Math.min(cropCanvas.width - cropState.cropX, point.x - cropState.cropX));
            cropState.cropHeight = Math.max(minSize, Math.min(cropCanvas.height - cropState.cropY, point.y - cropState.cropY));
        } else if (handle === 'sw') {
            const newX = Math.max(0, point.x);
            const newWidth = cropState.cropX + cropState.cropWidth - newX;
            if (newWidth >= minSize) {
                cropState.cropX = newX;
                cropState.cropWidth = newWidth;
            }
            cropState.cropHeight = Math.max(minSize, Math.min(cropCanvas.height - cropState.cropY, point.y - cropState.cropY));
        } else if (handle === 'ne') {
            cropState.cropWidth = Math.max(minSize, Math.min(cropCanvas.width - cropState.cropX, point.x - cropState.cropX));
            const newY = Math.max(0, point.y);
            const newHeight = cropState.cropY + cropState.cropHeight - newY;
            if (newHeight >= minSize) {
                cropState.cropY = newY;
                cropState.cropHeight = newHeight;
            }
        } else if (handle === 'nw') {
            const newX = Math.max(0, point.x);
            const newWidth = cropState.cropX + cropState.cropWidth - newX;
            if (newWidth >= minSize) {
                cropState.cropX = newX;
                cropState.cropWidth = newWidth;
            }
            const newY = Math.max(0, point.y);
            const newHeight = cropState.cropY + cropState.cropHeight - newY;
            if (newHeight >= minSize) {
                cropState.cropY = newY;
                cropState.cropHeight = newHeight;
            }
        }
        
        updateCropBox();
    }

    function getEventPoint(e) {
        const rect = cropCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // Apply crop - EINFACHE 1:1 UMRECHNUNG
    applyCrop.addEventListener('click', () => {
    const img = cropState.image;
    
    // ========== DEBUG START ==========
    console.log('=== CROP DEBUG ===');
    console.log('Original image:', img.width, 'x', img.height);
    console.log('Canvas:', cropCanvas.width, 'x', cropCanvas.height);
    console.log('Crop box:', cropState.cropX, cropState.cropY, cropState.cropWidth, cropState.cropHeight);
    // ========== DEBUG END ==========
    
    // Umrechnungsfaktor: Canvas → Original-Bild
    const scaleX = img.width / cropCanvas.width;
    const scaleY = img.height / cropCanvas.height;
    
    // ========== DEBUG START ==========
    console.log('Scale factors:', scaleX, scaleY);
    // ========== DEBUG END ==========
    
    // Crop-Koordinaten umrechnen
    const origX = cropState.cropX * scaleX;
    const origY = cropState.cropY * scaleY;
    const origW = cropState.cropWidth * scaleX;
    const origH = cropState.cropHeight * scaleY;
    
    // ========== DEBUG START ==========
    console.log('Calculated crop:', origX, origY, origW, origH);
    // ========== DEBUG END ==========
    
    // Cropped Canvas erstellen
    const cropped = document.createElement('canvas');
    cropped.width = Math.round(origW);
    cropped.height = Math.round(origH);
    const cctx = cropped.getContext('2d');
    
    // ========== DEBUG START ==========
    console.log('Output canvas:', cropped.width, 'x', cropped.height);
    // ========== DEBUG END ==========
    
    // Exakt den gewählten Ausschnitt aus Original-Bild kopieren
    cctx.drawImage(
        img,
        origX, origY, origW, origH,
        0, 0, cropped.width, cropped.height
    );
    
    const croppedImg = new Image();
    croppedImg.onload = () => {
        cropModal.classList.remove('active');
        
        // ========== DEBUG START ==========
        console.log('Final image:', croppedImg.width, 'x', croppedImg.height);
        console.log('===================');
        // ========== DEBUG END ==========
        
        processImage(croppedImg);
    };
    croppedImg.src = cropped.toDataURL('image/jpeg', 0.95);
});
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
    // ========== DEBUG START ==========
    console.log('=== PROCESS IMAGE ===');
    console.log('Input:', img.width, 'x', img.height);
    // ========== DEBUG END ==========
    
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

    // ========== DEBUG START ==========
    console.log('Output:', photo.width, 'x', photo.height);
    console.log('Rotated:', photoWasRotated);
    console.log('=====================');
    // ========== DEBUG END ==========

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

        // ========== DEBUG START ==========
        console.log('=== RENDER (no PP) ===');
        console.log('Photo:', photo.width, 'x', photo.height);
        console.log('Frame width:', frameWidth);
        console.log('Scale factor:', scaleFactor);
        // ========== DEBUG END ==========

        scaledPhotoW = photo.width * scaleFactor;
        scaledPhotoH = photo.height * scaleFactor;

        fullW = photo.width;
        fullH = photo.height;

        photoX = (fullW - scaledPhotoW) / 2;
        photoY = (fullH - scaledPhotoH) / 2;

        // ========== DEBUG START ==========
        console.log('Scaled photo:', scaledPhotoW, 'x', scaledPhotoH);
        console.log('Full canvas:', fullW, 'x', fullH);
        console.log('Photo position:', photoX, photoY);
        console.log('=====================');
        // ========== DEBUG END ==========
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