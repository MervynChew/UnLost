import cv2
import numpy as np
import math
import base64
import torch
import os
from collections import Counter
from ultralytics import YOLO

class RobustDetectorAPI:
    def __init__(self, model_paths=None): 
        if model_paths is None:
            model_paths = ['yolov8s.pt'] # Default to standard only

        # 1. Auto-detect GPU
        self.device = 0 if torch.cuda.is_available() else 'cpu'
        device_name = torch.cuda.get_device_name(0) if self.device == 0 else "CPU"
        print(f"🚀 Running on: {device_name}")
        
        # 2. Load ALL Models
        self.models = []
        for path in model_paths:
            if os.path.exists(path) or path.startswith("yolov8"):
                print(f"Loading Model: {path}...")
                self.models.append(YOLO(path))
            else:
                print(f"⚠️ Warning: Model '{path}' not found. Skipping.")
        
        print(f"✅ Loaded {len(self.models)} models successfully.")

        # Color Map
        self.color_map = {
            "Red": (255, 0, 0), "Green": (0, 255, 0), "Blue": (0, 0, 255),
            "Yellow": (255, 255, 0), "Cyan": (0, 255, 255), "Magenta": (255, 0, 255),
            "White": (255, 255, 255), "Black": (0, 0, 0), "Gray": (128, 128, 128),
            "Orange": (255, 165, 0), "Purple": (128, 0, 128), "Pink": (255, 192, 203),
            "Brown": (165, 42, 42), "Beige": (245, 245, 220), "Navy": (0, 0, 128),
            "Teal": (0, 128, 128)
        }

    def get_closest_color(self, rgb):
        r, g, b = rgb
        min_dist = float('inf')
        closest_name = "Unknown"
        for name, (cr, cg, cb) in self.color_map.items():
            dist = math.sqrt((r - cr)**2 + (g - cg)**2 + (b - cb)**2)
            if dist < min_dist:
                min_dist = dist
                closest_name = name
        return closest_name

    def get_dominant_color(self, img_crop):
        if img_crop.size == 0: return "Unknown"
        h, w, _ = img_crop.shape
        center_crop = img_crop[int(h*0.25):int(h*0.75), int(w*0.25):int(w*0.75)]
        if center_crop.size == 0: center_crop = img_crop

        img_small = cv2.resize(center_crop, (64, 64))
        img_blur = cv2.GaussianBlur(img_small, (5, 5), 0)
        crop_rgb = cv2.cvtColor(img_blur, cv2.COLOR_BGR2RGB)
        
        pixels = crop_rgb.reshape(-1, 3)
        pixels_quantized = (pixels // 50) * 50
        pixels_list = [tuple(p) for p in pixels_quantized]
        
        if not pixels_list: return "Unknown"
        most_common_color = Counter(pixels_list).most_common(1)[0][0]
        return self.get_closest_color(most_common_color)

    def process_frame(self, image_bytes, client_id):
        # Decode & Resize
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: return {"error": "Invalid image"}
        
        orig_h, orig_w = img.shape[:2]
        if orig_w > 1280:
            scale = 1280 / orig_w
            img = cv2.resize(img, None, fx=scale, fy=scale)
        h, w, _ = img.shape
        center_x, center_y = w // 2, h // 2

        response = {
            "found": False, "label": "None", "color": "None", "image_base64": None
        }

        # --- RUN ALL MODELS ---
        all_detections = []

        for model in self.models:
            # Run inference for each model
            results = model.predict(img, verbose=False, conf=0.50, device=self.device, agnostic_nms=True)
            
            if results[0].boxes and results[0].boxes.id is None:
                # Note: 'predict' doesn't return IDs usually, only 'track' does.
                # For static image analysis, simple predict is faster/better if tracking isn't critical.
                all_detections.extend(self._extract_boxes(results[0], model.names))

        # --- FIND BEST OBJECT ---
        if all_detections:
            best_obj = None
            min_dist = float('inf')

            for det in all_detections:
                x1, y1, x2, y2 = det['box']
                label = det['label']
                
                if label == 'person': continue 
                
                box_area = (x2 - x1) * (y2 - y1)
                if box_area < (w * h * 0.05): continue 

                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                dist = math.hypot(center_x - cx, center_y - cy)

                if dist < min_dist:
                    min_dist = dist
                    best_obj = det

            if best_obj:
                x1, y1, x2, y2 = best_obj['box']
                label = best_obj['label']
                
                crop = img[int(y1):int(y2), int(x1):int(x2)]
                color_name = self.get_dominant_color(crop)
                
                annotated = img.copy()
                cv2.rectangle(annotated, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 4)
                cv2.putText(annotated, f"{label.upper()} ({color_name})", 
                          (int(x1), int(y1) - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 3)

                _, buffer = cv2.imencode('.jpg', annotated)
                img_base64 = base64.b64encode(buffer).decode('utf-8')

                response = {
                    "found": True, "label": label, "color": color_name, "image_base64": img_base64
                }

        return response

    def _extract_boxes(self, result, names):
        extracted = []
        boxes = result.boxes.xyxy.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy()
        
        for box, cls_id in zip(boxes, classes):
            extracted.append({
                'box': box,
                'label': names[int(cls_id)]
            })
        return extracted