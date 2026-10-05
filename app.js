import { classifyQrText } from './qr-utils.js';

const fileInput = document.querySelector('#file-input');
const dropZone = document.querySelector('#drop-zone');
const pasteButton = document.querySelector('#paste-button');
const previewCanvas = document.querySelector('#preview-canvas');
const previewContext = previewCanvas.getContext('2d', { willReadFrequently: true });
const emptyState = document.querySelector('#empty-state');
const busyState = document.querySelector('#busy-state');
const resultState = document.querySelector('#result-state');
const errorState = document.querySelector('#error-state');
const urlResult = document.querySelector('#url-result');
const textResult = document.querySelector('#text-result');
const openLink = document.querySelector('#open-link');
const copyButton = document.querySelector('#copy-button');
const resultLabel = document.querySelector('#result-label');
const resultTitle = document.querySelector('#result-title');
const errorTitle = document.querySelector('#error-title');
const errorMessage = document.querySelector('#error-message');

let currentText = '';

function showState(state) {
  emptyState.hidden = state !== 'empty';
  busyState.hidden = state !== 'busy';
  resultState.hidden = state !== 'result';
  errorState.hidden = state !== 'error';
}

function isImage(file) {
  return file && file.type.startsWith('image/');
}

async function loadImage(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file, { imageOrientation: 'from-image' });
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function renderImage(image) {
  const maxSide = 2400;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  previewCanvas.width = Math.max(1, Math.round(image.width * scale));
  previewCanvas.height = Math.max(1, Math.round(image.height * scale));
  previewContext.drawImage(image, 0, 0, previewCanvas.width, previewCanvas.height);
}

function drawQrOutline(location) {
  const points = [location.topLeftCorner, location.topRightCorner, location.bottomRightCorner, location.bottomLeftCorner];
  previewContext.save();
  previewContext.strokeStyle = '#e85d35';
  previewContext.lineWidth = Math.max(4, Math.min(previewCanvas.width, previewCanvas.height) / 100);
  previewContext.lineJoin = 'round';
  previewContext.beginPath();
  previewContext.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => previewContext.lineTo(point.x, point.y));
  previewContext.closePath();
  previewContext.stroke();
  previewContext.restore();
}

function decodeCanvas() {
  const imageData = previewContext.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
  return window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
}

function renderResult(decoded) {
  const result = classifyQrText(decoded.data);
  currentText = result.text;
  drawQrOutline(decoded.location);
  urlResult.hidden = true;
  textResult.hidden = true;
  openLink.hidden = true;

  if (result.kind === 'url') {
    resultLabel.textContent = 'WEB ADDRESS FOUND';
    resultTitle.textContent = '웹주소를 찾았습니다';
    urlResult.textContent = result.text;
    urlResult.href = result.href;
    urlResult.hidden = false;
    openLink.href = result.href;
    openLink.hidden = false;
  } else {
    resultLabel.textContent = 'QR CONTENT FOUND';
    resultTitle.textContent = 'QR 내용을 찾았습니다';
    textResult.textContent = result.text || '(빈 내용)';
    textResult.hidden = false;
  }
  showState('result');
}

function showError(title, message) {
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  showState('error');
}

async function processFile(file) {
  if (!isImage(file)) {
    showError('이미지 파일이 아닙니다', 'PNG, JPG, WEBP, GIF 형식의 이미지를 선택해 주세요.');
    return;
  }
  showState('busy');
  try {
    const image = await loadImage(file);
    renderImage(image);
    if (typeof image.close === 'function') image.close();
    await new Promise(resolve => requestAnimationFrame(resolve));
    const decoded = decodeCanvas();
    if (!decoded) {
      showError('QR 코드를 찾지 못했습니다', 'QR 부분이 선명하고 화면 안에 온전히 들어온 이미지를 사용해 보세요.');
      return;
    }
    renderResult(decoded);
  } catch (error) {
    console.error(error);
    showError('이미지를 읽을 수 없습니다', '파일이 손상되지 않았는지 확인한 뒤 다시 시도해 주세요.');
  }
}

async function pasteFromClipboard() {
  if (!navigator.clipboard?.read) {
    showError('클립보드 접근을 지원하지 않습니다', '이미지 선택 버튼을 사용하거나 복사한 이미지를 Ctrl+V로 붙여넣어 주세요.');
    return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (imageType) {
        await processFile(await item.getType(imageType));
        return;
      }
    }
    showError('클립보드에 이미지가 없습니다', 'QR 코드가 있는 이미지를 복사한 뒤 다시 시도해 주세요.');
  } catch {
    showError('클립보드를 읽지 못했습니다', '브라우저의 클립보드 권한을 허용하거나 이미지 선택 버튼을 사용해 주세요.');
  }
}

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) processFile(fileInput.files[0]);
});

['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.add('is-dragging');
}));
['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.remove('is-dragging');
}));
dropZone.addEventListener('drop', event => {
  const file = [...event.dataTransfer.files].find(isImage);
  if (file) processFile(file);
  else showError('이미지 파일이 없습니다', 'QR 코드가 포함된 이미지 파일을 끌어놓아 주세요.');
});
dropZone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

document.addEventListener('paste', event => {
  const file = [...event.clipboardData.files].find(isImage);
  if (file) processFile(file);
});
pasteButton.addEventListener('click', pasteFromClipboard);
document.querySelector('#reset-button').addEventListener('click', () => fileInput.click());
document.querySelector('#retry-button').addEventListener('click', () => fileInput.click());
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentText);
    const original = copyButton.textContent;
    copyButton.textContent = '복사됨';
    setTimeout(() => { copyButton.textContent = original; }, 1400);
  } catch {
    showError('복사하지 못했습니다', '브라우저 권한을 확인하거나 내용을 길게 눌러 직접 복사해 주세요.');
  }
});
