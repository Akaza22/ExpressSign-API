from flask import Flask, request, jsonify
import numpy as np
from PIL import Image
import tensorflow as tf
import io

app = Flask(__name__)

# Muat model TensorFlow Lite untuk ekspresi wajah
expression_interpreter = tf.lite.Interpreter(model_path="./model.tflite")
expression_interpreter.allocate_tensors()

expression_input_details = expression_interpreter.get_input_details()
expression_output_details = expression_interpreter.get_output_details()

expression_input_shape = expression_input_details[0]['shape']
expression_input_height, expression_input_width = expression_input_shape[1], expression_input_shape[2]

expression_labels = ['Angry', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']

# Muat model TensorFlow Lite untuk handsign
handsign_interpreter = tf.lite.Interpreter(model_path="./handsign_model.tflite")
handsign_interpreter.allocate_tensors()

handsign_input_details = handsign_interpreter.get_input_details()
handsign_output_details = handsign_interpreter.get_output_details()

handsign_input_shape = handsign_input_details[0]['shape']
handsign_input_height, handsign_input_width = handsign_input_shape[1], handsign_input_shape[2]

handsign_labels = [chr(i) for i in range(ord('A'), ord('Z')+1)]

def preprocess_image(image_file, input_height, input_width):
    image = Image.open(image_file).resize((input_width, input_height))
    image = np.array(image).astype(np.float32)
    image = (image / 255.0) if 'dtype' in expression_input_details[0] and expression_input_details[0]['dtype'] == np.float32 else image
    image = np.expand_dims(image, axis=0)  # Menambahkan dimensi batch
    return image

@app.route('/predict-expression', methods=['POST'])
def predict_expression():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    imagefile = request.files['image']
    if imagefile.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        image = preprocess_image(io.BytesIO(imagefile.read()), expression_input_height, expression_input_width)
        expression_interpreter.set_tensor(expression_input_details[0]['index'], image)
        expression_interpreter.invoke()
        output_data = expression_interpreter.get_tensor(expression_output_details[0]['index'])
        predicted_label_index = np.argmax(output_data)
        predicted_label = expression_labels[predicted_label_index]
        accuracy = output_data[0][predicted_label_index] * 100
        classification = f'{predicted_label}'
        return jsonify({'prediction': classification})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detect-sign-language', methods=['POST'])
def detect_sign_language():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    imagefile = request.files['image']
    if imagefile.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        image = preprocess_image(io.BytesIO(imagefile.read()), handsign_input_height, handsign_input_width)
        handsign_interpreter.set_tensor(handsign_input_details[0]['index'], image)
        handsign_interpreter.invoke()
        output_data = handsign_interpreter.get_tensor(handsign_output_details[0]['index'])
        predicted_label_index = np.argmax(output_data)
        predicted_label = handsign_labels[predicted_label_index]
        accuracy = output_data[0][predicted_label_index] * 100
        classification = f'{predicted_label}'
        return jsonify({'prediction': classification})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)
