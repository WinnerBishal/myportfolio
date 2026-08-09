---
layout: post
title: A Comprehensive Evaluation of YOLO-Based Deer Detection Performance on Edge Devices
article_title: A Comprehensive Evaluation of YOLO-Based Deer Detection Performance on Edge Devices
description: Evaluation of deep learning models for real-time deer detection on edge computing platforms
abstract: |
  The escalating economic losses in agriculture due to deer intrusion, estimated to be in the hundreds of millions of dollars annually in the U.S., highlight the inadequacy of traditional mitigation strategies such as hunting, fencing, use of repellents, and scare tactics. This underscores a critical need for intelligent, autonomous solutions capable of real-time deer detection and deterrence. But the progress in this field is impeded by a significant gap in the literature, mainly the lack of a domain-specific, practical dataset and limited studies on the viability of deer detection systems on edge devices. To address this gap, this study presents a comprehensive evaluation of state-of-the-art deep learning models for deer detection in challenging real-world scenarios. We introduce a curated, publicly available dataset of 3095 annotated images with bounding box annotation of deer. Then, we provide an extensive comparative analysis of 12 model variants across four recent YOLO architectures (v8 to v11). Finally, we evaluated their performance on two representative edge computing platforms, the CPU-based Raspberry Pi 5 and the GPU-accelerated NVIDIA Jetson AGX Xavier, to assess feasibility for real-world field deployment. To ensure a standardized comparison, we established a framework-agnostic deployment pipeline using universal Open Neural Network Exchange (ONNX) runtimes. Results show that the real-time detection performance is not feasible on Raspberry Pi using universal runtimes, suggesting that while framework-agnostic runtimes facilitate portability, low-power CPU deployment requires hardware-specific optimization to achieve real-time thresholds. Conversely, NVIDIA Jetson provides greater than 30 frames per second (FPS) with 's' and 'n' series models. This study also reveals that smaller, architecturally advanced models such as YOLOv11n, YOLOv8s, and YOLOv9s offer the optimal balance of high accuracy (Average Precision (AP) > 0.85) and computational efficiency (Inference Time < 34 milliseconds).
tags: [YOLO, deep learning, edge computing, computer vision, deer detection, Raspberry Pi, NVIDIA Jetson]
read_more_type: paper
read_more_url: https://www.mdpi.com/2079-9292/15/5/1026
paper_url: https://www.mdpi.com/2079-9292/15/5/1026
authors:
  - name: Bishal Adhikari
    orcid: 0009-0001-1599-5499
  - name: Jiajia Li
  - name: Eric S Michel
  - name: Jacob Dykes
    orcid: 0009-0000-0649-496X
  - name: Te-Ming Tseng
    orcid: 0000-0002-8102-8149
  - name: Mary Love Tagert
    orcid: 0000-0002-0745-2099
  - name: Dong Chen
    orcid: 0000-0002-0551-5084
---
