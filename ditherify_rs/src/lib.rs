#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

fn brightness(r: u8, g: u8, b: u8) -> u8 {
  let cmax = if r > g { r } else { g };
  let cmax = if b > cmax { b } else { cmax };
  cmax
}

fn clamp_255(v: f32) -> u8 {
  if v > 255.0 {
    255
  } else if v < 0.0 {
    0
  } else {
    v as u8
  }
}

const OFFSETS: [[i32; 2]; 6] = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];

pub struct Image {
  bytes: Vec<u8>,
  width: i32,
  height: i32,
  error_factor: f32,
}

fn image_deref<'a>(image_ptr: *mut Image) -> &'a mut Image {
  unsafe { &mut *image_ptr }
}

#[no_mangle]
pub extern "C" fn image_new(width: i32, height: i32) -> *mut Image {
  let mut bytes = Vec::new();
  bytes.resize((width * height * 4) as usize, 255);
  let image = Image {
    bytes,
    width,
    height,
    error_factor: 0.125,
  };
  Box::into_raw(Box::new(image))
}

#[no_mangle]
pub extern "C" fn image_free(image_ptr: *mut Image) {
  unsafe {
    drop(Box::from_raw(image_ptr));
  };
}

#[no_mangle]
pub extern "C" fn image_height(image_ptr: *mut Image) -> i32 {
  let image = image_deref(image_ptr);
  image.height
}

#[no_mangle]
pub extern "C" fn image_width(image_ptr: *mut Image) -> i32 {
  let image = image_deref(image_ptr);
  image.width
}

#[no_mangle]
pub extern "C" fn image_set_error_factor(image_ptr: *mut Image, error_factor: f32) {
  let image = image_deref(image_ptr);
  image.error_factor = error_factor;
}

#[no_mangle]
pub extern "C" fn image_bytes(image_ptr: *mut Image) -> *mut u8 {
  let image = image_deref(image_ptr);
  image.bytes.as_mut_ptr()
}

#[no_mangle]
pub extern "C" fn image_dither(image_ptr: *mut Image) {
  let image = image_deref(image_ptr);
  let width = image.width;
  let height = image.height;
  let stride = width * 4;
  for x in 0..width {
    for y in 0..height {
      let pos = (y * stride + x * 4) as usize;
      let r = image.bytes[pos + 0];
      let g = image.bytes[pos + 1];
      let b = image.bytes[pos + 2];
      let bright = brightness(r, g, b);
      let err: f32;
      if bright <= 127 {
        image.bytes[pos + 0] = 0x00;
        image.bytes[pos + 1] = 0x00;
        image.bytes[pos + 2] = 0x00;
        err = bright as f32;
      } else {
        image.bytes[pos + 0] = 0xff;
        image.bytes[pos + 1] = 0xff;
        image.bytes[pos + 2] = 0xff;
        err = bright as f32 - 255.0;
      }
      for [dx, dy] in &OFFSETS {
        let x2 = x + dx;
        let y2 = y + dy;
        if x2 < width && y2 < height {
          let pos2 = (y2 * stride + x2 * 4) as usize;
          let r2 = image.bytes[pos2];
          let g2 = image.bytes[pos2 + 1];
          let b2 = image.bytes[pos2 + 2];
          let mut bright2 = brightness(r2, g2, b2) as f32;
          bright2 += err * image.error_factor;
          // let gray = bright2 as u8;
          let gray = clamp_255(bright2);
          image.bytes[pos2 + 0] = gray;
          image.bytes[pos2 + 1] = gray;
          image.bytes[pos2 + 2] = gray;
        }
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_image_new() {
    let image = image_new(800, 600);
    assert_eq!(image_width(image), 800);
    assert_eq!(image_height(image), 600);
    assert_eq!(2 + 2, 4);
    image_free(image);
  }

  #[test]
  fn test_image_bytes() {
    let image = image_new(800, 600);
    let bytes_ptr = image_bytes(image);
    let bytes = unsafe { std::slice::from_raw_parts(bytes_ptr, 800 * 600 * 4) };
    assert_eq!(bytes[0], 255);
    image_free(image);
  }
}
