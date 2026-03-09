pub const SHARED_RING_HEADER_BYTES: usize = 20;

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct SharedRingHeader {
    pub read_index: u32,
    pub write_index: u32,
    pub capacity: u32,
    pub stride: u32,
    pub data_ptr: u32,
}

pub struct SharedRing {
    header: Box<SharedRingHeader>,
    data: Box<[u8]>,
}

impl SharedRing {
    pub fn new(capacity: u32, stride: u32) -> Self {
        let next_capacity = capacity.max(2);
        let next_stride = stride.max(1);
        let byte_len = next_capacity as usize * next_stride as usize;

        let mut data = vec![0_u8; byte_len].into_boxed_slice();
        let data_ptr = data.as_mut_ptr() as usize as u32;

        let header = Box::new(SharedRingHeader {
            read_index: 0,
            write_index: 0,
            capacity: next_capacity,
            stride: next_stride,
            data_ptr,
        });

        Self { header, data }
    }

    pub fn header_ptr(&mut self) -> u32 {
        (&mut *self.header as *mut SharedRingHeader as usize) as u32
    }

    pub fn header(&self) -> &SharedRingHeader {
        &self.header
    }

    pub fn clear(&mut self) {
        self.header.read_index = self.header.write_index;
    }

    pub fn pop(&mut self, scratch: &mut [u8]) -> bool {
        let stride = self.header.stride as usize;
        if scratch.len() < stride {
            return false;
        }

        let read_index = self.header.read_index;
        let write_index = self.header.write_index;
        if read_index == write_index {
            return false;
        }

        let slot_index = read_index as usize;
        let offset = slot_index * stride;
        scratch[..stride].copy_from_slice(&self.data[offset..offset + stride]);

        self.header.read_index = (read_index + 1) % self.header.capacity;
        true
    }
}
