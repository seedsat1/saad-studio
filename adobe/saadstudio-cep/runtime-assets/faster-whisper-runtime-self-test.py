import json
import platform
import sys
import subprocess
import ctypes
import os

def package_version(name):
    try:
        from importlib.metadata import version
        return version(name)
    except Exception:
        return None

def get_gpu_info():
    # Try using nvidia-smi first
    try:
        output = subprocess.check_output(["nvidia-smi", "--query-gpu=name,vendor.name", "--format=csv,noheader"], text=True)
        parts = [p.strip() for p in output.split(",") if p.strip()]
        if len(parts) >= 2:
            return parts[0], parts[1]
        elif len(parts) == 1:
            return parts[0], "NVIDIA"
    except Exception:
        pass

    # Fallback to Win32_VideoController via PowerShell
    try:
        ps_cmd = "Get-CimInstance Win32_VideoController | ForEach-Object { [PSCustomObject]@{Name=$_.Name; Compatibility=$_.AdapterCompatibility} } | ConvertTo-Json"
        proc = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
        if proc.returncode == 0 and proc.stdout.strip():
            data = json.loads(proc.stdout.strip())
            if isinstance(data, dict):
                data = [data]
            
            # Prefer NVIDIA GPU if present
            for item in data:
                name = item.get("Name", "")
                compat = item.get("Compatibility", "")
                if "nvidia" in name.lower() or "nvidia" in compat.lower():
                    return name, compat
            if data:
                return data[0].get("Name", "Unknown GPU"), data[0].get("Compatibility", "Unknown")
    except Exception:
        pass
        
    return "Unknown GPU", "Unknown Vendor"

def get_cudnn_version():
    # Safe check: do not load cudnn DLLs using ctypes because missing sub-dependencies 
    # (like cudnn_graph64_9.dll) cause cuDNN library initialization to crash the host python process.
    try:
        import ctranslate2
        ct2_dir = os.path.dirname(ctranslate2.__file__)
        for dll in ["cudnn64_9.dll", "cudnn64_8.dll"]:
            dll_path = os.path.join(ct2_dir, dll)
            if os.path.exists(dll_path):
                v_num = dll.split("_")[1].split(".")[0]
                if v_num == "9":
                    # cuDNN 9 expects cudnn_graph64_9.dll, etc. to be present
                    graph_path = os.path.join(ct2_dir, "cudnn_graph64_9.dll")
                    if os.path.exists(graph_path):
                        return "9.x"
                    else:
                        return "9.x (Incomplete: cudnn_graph64_9.dll is missing)"
                return f"{v_num}.x"
    except Exception:
        pass
        
    # Search in PATH directories without loading
    path_dirs = os.environ.get("PATH", "").split(os.pathpathsep if hasattr(os, "pathpathsep") else ";")
    for directory in path_dirs:
        if not directory or not os.path.isdir(directory):
            continue
        for dll in ["cudnn64_9.dll", "cudnn64_8.dll"]:
            if os.path.exists(os.path.join(directory, dll)):
                v_num = dll.split("_")[1].split(".")[0]
                return f"{v_num}.x (in PATH)"
                
    return "Not Detected"

def check_cuda_functional():
    try:
        import ctranslate2
        cuda_types = ctranslate2.get_supported_compute_types("cuda")
        if not cuda_types:
            return False, "ctranslate2 compiled without CUDA support", []
    except Exception as e:
        return False, f"ctranslate2 import failed: {e}", []

    # Check DLL availability via ctypes
    required_dlls = ["cublas64_12.dll", "cublasLt64_12.dll", "cudart64_12.dll"]
    for dll in required_dlls:
        try:
            ctypes.CDLL(dll)
        except Exception as e:
            return False, f"Library {dll} is not found or cannot be loaded: {e}", sorted(list(cuda_types))

    return True, None, sorted(list(cuda_types))

def get_cuda_version():
    try:
        proc = subprocess.run(["nvcc", "--version"], capture_output=True, text=True)
        if proc.returncode == 0:
            for line in proc.stdout.splitlines():
                if "release" in line:
                    parts = line.split("release")[-1].strip().split(",")
                    if parts:
                        return parts[0].strip()
    except Exception:
        pass
    
    try:
        proc = subprocess.run(["nvidia-smi"], capture_output=True, text=True)
        if proc.returncode == 0:
            for line in proc.stdout.splitlines():
                if "CUDA Version" in line:
                    idx = line.find("CUDA Version:")
                    if idx != -1:
                        part = line[idx + len("CUDA Version:"):].strip().split()[0]
                        return part.strip()
    except Exception:
        pass

    try:
        base_dir = r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA"
        if os.path.exists(base_dir):
            dirs = os.listdir(base_dir)
            if dirs:
                return dirs[-1]
    except Exception:
        pass

    try:
        cuda_path = os.environ.get("CUDA_PATH")
        if cuda_path:
            return os.path.basename(cuda_path)
    except Exception:
        pass

    return "Not Detected"

def get_device_detections():
    ct2_detect = "Not Detected"
    fw_detect = "Not Detected"
    
    try:
        import ctranslate2
        count = ctranslate2.get_cuda_device_count()
        if count > 0:
            ct2_detect = f"{count} CUDA device(s) detected"
        else:
            ct2_detect = "0 CUDA devices detected (CPU only)"
    except Exception as e:
        ct2_detect = f"Import error: {e}"
        
    try:
        import faster_whisper
        fw_detect = "CTranslate2 Backend Ready"
    except Exception as e:
        fw_detect = f"Import error: {e}"
        
    return ct2_detect, fw_detect

def main():
    gpu_name, gpu_vendor = get_gpu_info()
    ct2_detect, fw_detect = get_device_detections()
    cudnn_version = get_cudnn_version()
    
    result = {
        "ok": False,
        "pythonVersion": platform.python_version(),
        "platform": platform.platform(),
        "fasterWhisperVersion": package_version("faster-whisper"),
        "ctranslate2Version": package_version("ctranslate2"),
        "gpuName": gpu_name,
        "gpuVendor": gpu_vendor,
        "cudaAvailable": False,
        "cudaVersion": get_cuda_version(),
        "cuDNNVersion": cudnn_version,
        "ctranslate2DeviceDetection": ct2_detect,
        "fasterWhisperDeviceDetection": fw_detect,
        "whisperCudaLoadOk": False,
        "exactCudaError": None,
        "cudaComputeTypes": [],
        "cpuComputeTypes": [],
        "errors": [],
    }
    
    try:
        import faster_whisper  # noqa: F401
        import ctranslate2
        result["cpuComputeTypes"] = sorted(ctranslate2.get_supported_compute_types("cpu"))
        
        cuda_ok, cuda_err, cuda_types = check_cuda_functional()
        result["cudaComputeTypes"] = cuda_types
        result["cudaAvailable"] = ctranslate2.get_cuda_device_count() > 0
        result["whisperCudaLoadOk"] = cuda_ok
        result["exactCudaError"] = cuda_err
        
        if cuda_err:
            result["errors"].append("CUDA_PROBE: " + cuda_err)
            
        result["ok"] = True
    except Exception as exc:
        result["errors"].append("IMPORT_PROBE: " + str(exc))
        
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["ok"] else 1

if __name__ == "__main__":
    sys.exit(main())
