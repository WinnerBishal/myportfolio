---
name: Future Farming XR
order: 6
tools: [Extended Reality, Meta Quest, Farm-ng Amiga, Telepresence, Fleet Management]
image: /assets/images/posters/diorama.jpg
motion: /assets/motion/diorama.mp4
description: An extended reality command centre for supervising autonomous farm fleets, and remotely stepping into a machine when something goes wrong.
report:
  file: /assets/reports/future-farming-xr.pdf
  title: "Future Farming XR: An Extended Reality Command Center for Autonomous Fleet Management and Farm Supervision"
  pages: 28
  sizeMb: 24
  cover: /assets/images/future-farming/report-cover.png
layout: project-details
---

Autonomous robots and drones answer a real labour shortage on small and mid-scale
row-crop farms, but adoption stalls on a trust gap: the machines behave as black
boxes, and when one stops in the field the operator has no way to see why. The
bottleneck is no longer the hardware — it is the distance, physical and digital,
between the farmer and the machine.

Future Farming XR closes that distance. It is a single immersive interface,
running on Meta Quest headsets, that combines farm monitoring, autonomous fleet
management, and remote intervention: the operator can watch the field, understand
an anomaly in plain language, and virtually step into the driver's seat to resolve
it without travelling out to the machine.

Built with the **Maroon Robotics Team** at Mississippi State University for the
2026 Farm-ng student design competition, Division I.

## Platform architecture

The ecosystem is organised as four layers, each with defined responsibilities and
interfaces — the farm and hardware layer, the network layer, the data and
orchestration layer, and the interface layer.

![Platform architecture across four layers](/assets/images/future-farming/architecture.png)

The interface layer itself splits three ways by what the operator is doing:
a **strategic** view for planning and whole-farm awareness, a **tactical** view for
supervising and taking over an individual machine, and a **safety** layer that
governs handoff between them.

## Supervising a fleet

The dashboard puts every vehicle, its task, and its status in one view, so a
single operator can hold situational awareness across several machines at once.

When a machine raises an anomaly, an alert panel explains what happened in plain
language rather than a fault code, and offers the operator a decision.

![Multi-vehicle dashboard](/assets/images/future-farming/dashboard.png)
![Alert panel](/assets/images/future-farming/alert-panel.png)
![Detail panel](/assets/images/future-farming/detail-panel.png)

## Stepping into the machine

From an alert the operator can drop into a telepresence view of the vehicle and
drive it directly, with a 360° view of the robot's surroundings.

A simulated cabin gives the same controls for training and rehearsal, so an
operator can build confidence before touching a real machine in a real field.

![Telepresence view from the vehicle](/assets/images/future-farming/telepresence.jpg)
![Simulated operator cabin](/assets/images/future-farming/sim-cabin.jpg)

## What the evaluation showed

Three metrics were tested against the original proposal, using a structured survey
of five active Mississippi row-crop farmers, field testing on the Farm-ng Amiga,
and latency measurements across the communication pipeline:

- **Operator confidence.** Baseline confidence in autonomous equipment averaged
  6.0 out of 10. After exposure to monitoring plus remote takeover, confidence
  averaged 76 out of 100. Every respondent rated supervising multiple machines at
  once as very or extremely useful.
- **Remote operation accessibility.** Targeted onboarding under 45 minutes for
  operators with no prior VR or robotics experience.
- **System responsiveness.** Targeted sub-200 ms video latency and sub-500 ms
  telemetry latency, since perceptible lag between input and response is itself a
  destroyer of operator trust.

Full method, results, and discussion are in the report above.

## The team

![Maroon Robotics Team](/assets/images/future-farming/team.jpg)

Advised by Dr. Dong Chen and Dr. Alex Thomasson. Team: Moeen Ul Islam,
Bishal Adhikari, Cheng Ouyang, Kodia Watanabe, Emma Lovell, Lorien Harvey,
Eliana Wile, and Mason Jones.
