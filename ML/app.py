from flask import Flask, request, render_template
import numpy as np
from PIL import Image
import tensorflow as tf
import os

app = Flask(__name__)

# Setel direktori untuk menyimpan gambar yang diunggah
UPLOAD_FOLDER = './images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Muat model TensorFlow Lite untuk ekspresi wajah
expression_interpreter = tf.lite.Interpreter(model_path="./model.tflite")
expression_interpreter.allocate_tensors()

expression_input_details = expression_interpreter.get_input_details()
expression_output_details = expression_interpreter.get_output_details()

expression_input_shape = expression_input_details[0]['shape']
expression_input_height, expression_input_width = expression_input_shape[1], expression_input_shape[2]

expression_labels = ['Angry', 'Fear', 'Happy', 'Neutral', 'Sad', 'Suprise']

# Muat model TensorFlow Lite untuk handsign
handsign_interpreter = tf.lite.Interpreter(model_path="./handsign_model.tflite")
handsign_interpreter.allocate_tensors()

handsign_input_details = handsign_interpreter.get_input_details()
handsign_output_details = handsign_interpreter.get_output_details()

handsign_input_shape = handsign_input_details[0]['shape']
handsign_input_height, handsign_input_width = handsign_input_shape[1], handsign_input_shape[2]

handsign_labels = [chr(i) for i in range(ord('A'), ord('Z')+1)]

def preprocess_image(image_path, input_height, input_width):
    image = Image.open(image_path).resize((input_width, input_height))
    image = np.array(image).astype(np.float32)
    image = (image / 255.0) if 'dtype' in expression_input_details[0] and expression_input_details[0]['dtype'] == np.float32 else image
    image = np.expand_dims(image, axis=0)  # Menambahkan dimensi batch
    return image

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        if 'imagefile' not in request.files or 'prediction_type' not in request.form:
            return render_template('index.html', prediction='No file uploaded or prediction type not specified')

        imagefile = request.files['imagefile']
        if imagefile.filename == '':
            return render_template('index.html', prediction='No file selected')

        prediction_type = request.form['prediction_type']
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], imagefile.filename)
        imagefile.save(image_path)

        if prediction_type == 'expression':
            image = preprocess_image(image_path, expression_input_height, expression_input_width)
            expression_interpreter.set_tensor(expression_input_details[0]['index'], image)
            expression_interpreter.invoke()
            output_data = expression_interpreter.get_tensor(expression_output_details[0]['index'])
            predicted_label_index = np.argmax(output_data)
            predicted_label = expression_labels[predicted_label_index]
            accuracy = output_data[0][predicted_label_index] * 100
            classification = f'Predicted expression: {predicted_label} with accuracy: {accuracy:.2f}%'
        elif prediction_type == 'handsign':
            image = preprocess_image(image_path, handsign_input_height, handsign_input_width)
            handsign_interpreter.set_tensor(handsign_input_details[0]['index'], image)
            handsign_interpreter.invoke()
            output_data = handsign_interpreter.get_tensor(handsign_output_details[0]['index'])
            predicted_label_index = np.argmax(output_data)
            predicted_label = handsign_labels[predicted_label_index]
            accuracy = output_data[0][predicted_label_index] * 100
            classification = f'Predicted handsign: {predicted_label} with accuracy: {accuracy:.2f}%'

        return render_template('index.html', prediction=classification, image_url=imagefile.filename)
    else:
        return render_template('index.html')

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.run(port=3000, debug=True)
