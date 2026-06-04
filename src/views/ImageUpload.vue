<template>
  <div class="image-upload">
    <div v-if="preview" class="preview-container">
      <img :src="preview" alt="Preview" class="preview-image" />
      <button type="button" class="remove-btn" @click="removeImage">✕</button>
    </div>
    <label v-else class="upload-area">
      <input 
        type="file" 
        accept="image/*" 
        @change="handleFileSelect"
        class="file-input"
      />
      <div class="upload-placeholder">
        <span class="upload-text">{{ placeholder }}</span>
      </div>
    </label>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { api, getImageUrl } from '../api'

const props = defineProps({
  modelValue: String,
  placeholder: {
    type: String,
    default: 'Загрузить изображение'
  }
})

const emit = defineEmits(['update:modelValue'])

const preview = ref('')

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      preview.value = getImageUrl(newVal)
    } else {
      preview.value = ''
    }
  },
  { immediate: true }
)

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 5MB')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    preview.value = e.target.result
  }
  reader.readAsDataURL(file)
  
  try {
    const result = await api.uploadImage(file)
    emit('update:modelValue', result.url)
    preview.value = getImageUrl(result.url)
  } catch (e) {
    console.error('Upload failed:', e)
    alert('Ошибка загрузки изображения')
    preview.value = ''
  }
  
  event.target.value = ''
}

function removeImage() {
  preview.value = ''
  emit('update:modelValue', null)
}
</script>

<style scoped>
.image-upload {
  margin-bottom: 16px;
}

.upload-area {
  display: block;
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: var(--primary);
  background: rgba(108, 92, 231, 0.05);
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 2rem;
}

.upload-text {
  color: var(--gray);
  font-size: 0.9rem;
}

.preview-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 12px;
  border: 1px solid var(--border);
  display: block;
  margin: 0 auto;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(225, 112, 85, 0.9);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: background 0.2s;
}

.remove-btn:hover {
  background: rgba(225, 112, 85, 1);
}
</style>