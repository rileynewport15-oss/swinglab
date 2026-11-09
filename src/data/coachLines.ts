// ─────────────────────────────────────────────────────────────────────────────
// Everything the coaches say. Edit freely or add your own lines.
//
// - Every list holds variations of the same line. The coach picks one it
//   hasn't used yet in this conversation, so more variations = less repeating.
// - {words} in curly braces are filled in from the golfer's results:
//     Results lines: the numbers listed in the comment above each one
//       (e.g. {back} = backswing seconds, {in} = "2.5 inches" / "an inch").
//     Talk lines: {label} (e.g. "your takeaway"), {effects}, {cue}, {drill},
//       {how}, {reps}, {labels} as noted, and {shot} ("swing" or "stroke").
// - Keep each line to one or two sentences: replies are built from a few
//   lines and read out loud.
// - Only results the analysis actually produced are ever said, so a line can
//   state its number as fact. Low-confidence results get a "lowConfidence"
//   line in front of them automatically.
// ─────────────────────────────────────────────────────────────────────────────

import type { LineKey } from "@/lib/analysis/findings";
import type { IssueKey } from "./improvements";
import type { CoachId } from "@/lib/coach/coaches";

export type TalkKey =
  | "openIssues" // first sentence of the opening take when there's something to fix. {label} = the focus
  | "openClean" // first sentence when nothing needs fixing
  | "breakdownIntro" // first sentence of "Give me the breakdown"
  | "breakdownClean" // breakdown when nothing needs fixing
  | "alsoIssue" // lead-in before a second issue (a short sentence or "")
  | "openClose" // last sentence of the opening take
  | "focusIntro" // "What should I work on first?" {label}
  | "focusEffects" // {effects} = the issues it likely causes
  | "cue" // {cue} = the feel to try
  | "noFocus" // nothing to fix
  | "onlyHints" // only low-confidence hints to fix. {label}
  | "strengthsIntro" // "What did I do well?"
  | "noStrengths"
  | "drillIntro" // {drill} = drill name, {label} = the issue
  | "drillBody" // {how} {reps}
  | "noDrill" // nothing to fix
  | "shotsNone" // "Why does this cause bad shots?" with nothing to fix
  | "hypeOpen" // "Hype me up / roast me"
  | "hypeClose"
  | "lowConfidence" // in front of a low-confidence result. {label}
  | "hidden"; // {labels} = results too unclear to show

export type CoachBank = {
  results: Record<LineKey, string[]>;
  shots: Record<IssueKey, string[]>; // what the issue does on the course
  talk: Record<TalkKey, string[]>;
};

// ═════════════════════════════════════════════════════════════════════════════
// COACH SUNNY: warm, patient, leads with the good, never hides a problem.
// ═════════════════════════════════════════════════════════════════════════════

const SUNNY: CoachBank = {
  results: {
    // {ratio} {back} {down}
    "tempo-good": [
      "Your tempo is lovely: {ratio} to 1, with a {back} second backswing. That rhythm is something a lot of golfers chase for years.",
      "I love your rhythm. {back} seconds back and {down} seconds down is a {ratio} to 1 tempo, right where it should be.",
      "Your tempo is a real strength at {ratio} to 1. You give your body time to load before you unload it.",
    ],
    // {ratio} {back} {down} {extra}
    "tempo-rushed": [
      "Your backswing is a little quick at {back} seconds, a {ratio} to 1 tempo. Giving it about {extra} seconds more will let your body catch up.",
      "There's an opportunity in your tempo: {ratio} to 1 means the backswing is rushing. Just {extra} seconds longer going back would make a big difference.",
      "You're getting to the top in {back} seconds, which is a touch hurried at {ratio} to 1. Slow it down and you'll feel so much more in control.",
    ],
    // {ratio} {back} {down}
    "tempo-slow": [
      "Your downswing takes {down} seconds, which is slow for your {back} second backswing. Let it go a little more freely from the top.",
      "Your tempo is {ratio} to 1, so the downswing is easing in. Trust it and let the club speed up through the ball.",
      "I'd love to see a bit more pace coming down: {down} seconds is gentle for a {back} second backswing.",
    ],
    // {in} {pct}
    "finish-good": [
      "And that finish! You held it with {in} of movement, which tells me your balance was good the whole way.",
      "You held a balanced finish, moving {in}. That's a sign of a swing in control.",
      "Your finish is beautiful and steady, only {in} of wobble. Hold that pose proudly.",
    ],
    // {pct}
    "finish-back-foot": [
      "Your hips finished only {pct} percent of the way to your lead foot, so let's work on getting all the way through.",
      "At the finish your weight is still hanging back, about {pct} percent of the way forward. Finishing over the front foot is a great next step.",
      "You're finishing {pct} percent of the way forward. Let's get that belt buckle all the way over your lead foot.",
    ],
    // {in}
    "finish-wobble": [
      "You moved {in} right after reaching your finish, so your balance slipped a little. That's very fixable.",
      "Your finish wobbled by {in}. Holding it still is a lovely way to train balance.",
      "After the swing you shifted {in} to stay up, which tells me balance is an opportunity for you.",
    ],
    // {tilt} {flex}
    "posture-good": [
      "Your setup is athletic, with {tilt} degrees of forward tilt and {flex} degrees of knee flex. That's a great foundation.",
      "I love your posture at address: {tilt} degrees of tilt and {flex} degrees in the knees. You look ready to turn.",
      "Your address position is spot on, a {tilt} degree spine tilt with nicely flexed knees.",
    ],
    // {tilt}
    "posture-upright": [
      "You're standing a little tall at address, {tilt} degrees of tilt. Bending a bit more from the hips will give your arms room.",
      "Your spine is fairly upright at {tilt} degrees. A touch more bend from the hips is a nice easy win.",
      "At {tilt} degrees you're a bit upright over the ball. Let's hinge a little more and let the arms hang.",
    ],
    // {tilt}
    "posture-bent": [
      "You're bending over a lot at address, {tilt} degrees. Standing up a little will free up your turn.",
      "At {tilt} degrees of tilt you're quite bent over. Ease up a touch and you'll have more room to rotate.",
      "Your spine tilt is {tilt} degrees, a little much. A slightly taller setup will feel freer.",
    ],
    // {flex}
    "posture-straight-knees": [
      "Your knees are nearly straight at {flex} degrees. A little more flex will give you a stronger base.",
      "With only {flex} degrees of knee flex, let's soften the knees so you can turn with support.",
      "Softening your knees from {flex} degrees will make your setup much more athletic.",
    ],
    // {flex} {over}
    "posture-squat": [
      "You're sitting down a bit at address, {flex} degrees of knee flex. Standing about {over} degrees taller will free your hips.",
      "Your knees are flexed {flex} degrees, a little squatty. Rise up about {over} degrees and you'll turn more easily.",
      "At {flex} degrees you're sinking into your knees. Stand a little taller and your hips can rotate.",
    ],
    // {in}
    "takeaway-good": [
      "Your takeaway is lovely and neutral. The club starts on a great path.",
      "The way you take the club back is really solid, nicely on path at hip height.",
      "Your takeaway sets you up beautifully, with your hands moving back with your turn.",
    ],
    "takeaway-inside": [
      "Your hands whip {in} inside by hip height. Keeping the club in front of you a little longer is a great opportunity.",
      "Early in the backswing the club gets pulled {in} behind you. A wider, straighter takeaway will help everything after it.",
      "Your takeaway goes {in} inside. Let's keep the club head outside your hands a bit longer.",
    ],
    "takeaway-outside": [
      "Your hands push {in} out toward the ball in the takeaway. Turning your chest to start the club back will fix that nicely.",
      "The club goes {in} outside early on. Let's start it back with your turn instead of your hands.",
      "Your takeaway drifts {in} outside. Keeping your hands close to your trail thigh is the opportunity here.",
    ],
    // {before} {after} {loss}
    "trail-knee-good": [
      "Your trail knee held its flex beautifully, {before} degrees at address and {after} at the top. That gives your hips something to turn against.",
      "You kept your trail knee flexed in the backswing, which is a really solid move.",
      "Great job keeping that trail knee bent, it only lost {loss} degrees.",
    ],
    "trail-knee": [
      "Your trail leg straightens {loss} degrees in the backswing, from {before} to {after}. Keeping some flex there will help you hold your posture.",
      "Your trail knee loses {loss} degrees of flex going back. Feel like you keep that knee soft and you'll turn so much better.",
      "From {before} to {after} degrees, your trail knee straightens quite a bit. Holding that flex is a lovely next goal.",
    ],
    // {angle}
    "lead-arm-good": [
      "Your lead arm stays nice and wide at the top, only {angle} degrees of bend.",
      "I love the width at the top of your swing, just {angle} degrees of bend in the lead arm.",
      "Your lead arm is beautifully extended at the top at {angle} degrees.",
    ],
    "lead-arm": [
      "Your lead arm bends {angle} degrees at the top. A little more width will make your swing more consistent.",
      "At the top your lead elbow folds {angle} degrees. Let's keep that arc wider.",
      "There's {angle} degrees of bend in your lead arm at the top, and a shorter, wider backswing will help.",
    ],
    // {drop}
    "plane-good": [
      "You start the downswing right on plane, with your hands dropping {drop}. That's a beautiful move.",
      "Your transition is lovely: the hands drop into place instead of drifting out.",
      "The way you start down is really solid and right on plane.",
    ],
    // {in}
    "over-the-top": [
      "Your hands move {in} out toward the ball to start down, which is the over the top move. Letting them drop first is a great opportunity.",
      "As you start down, the hands push {in} outward. Feeling them drop toward your back pocket will help a lot.",
      "There's an over the top move here, {in} out at the start of the downswing. Very common, and very fixable.",
    ],
    "under-plane": [
      "Your hands drop {in} behind you to start down, so the club gets a bit stuck. Keeping them in front of your chest will help.",
      "The club falls {in} inside on the way down. Let's keep your hands more in front of you.",
      "Starting down, your hands get {in} behind your body. That's a great thing to clean up.",
    ],
    // {before} {after}
    "early-ext-good": [
      "You held your posture through impact really well, {after} degrees of your {before} degree address tilt.",
      "Great job staying in your posture through the ball. Your hips stayed back where they belong.",
      "You kept your spine angle through impact, which gives your arms room to swing.",
    ],
    // {deg} {in}
    "early-ext-both": [
      "Through impact you stand up {deg} degrees and your hips move {in} toward the ball. Staying in your posture is our big opportunity.",
      "Your hips push {in} toward the ball and you rise {deg} degrees by impact. Let's keep you down in it a little longer.",
      "There's some early extension: {deg} degrees of standing up and {in} of hip movement toward the ball. You'll love how it feels to stay down.",
    ],
    // {deg} {before} {after}
    "early-ext-spine": [
      "You stand up {deg} degrees by impact, from {before} to {after}. Holding that angle a little longer will give your arms room.",
      "Your spine rises {deg} degrees through the ball. Let's work on staying in your posture.",
      "Through impact you lose {deg} degrees of your posture. It's a really fixable pattern.",
    ],
    // {in}
    "early-ext-hips": [
      "Your hips move {in} toward the ball by impact. Keeping them back will give your arms more room.",
      "Through the ball your hips drift {in} forward toward the ball. Let's keep that backside back.",
      "Your hips crowd the ball by {in} at impact, which is a great thing to work on.",
    ],
    // {in}
    "head-height-good": [
      "Your head height stays nice and steady through the swing.",
      "I love how level your head stays, which helps you find the bottom of the swing every time.",
      "Your head stays steady through impact, a really solid habit.",
    ],
    "head-dip": [
      "Your head dips {in} during the swing. Staying a little taller will help you strike it cleaner.",
      "There's a {in} head drop on the way down. Let's keep your height steady.",
      "Your head sinks {in}, which lowers the bottom of your swing. Easy to improve.",
    ],
    "head-rise": [
      "Your head rises {in} by impact. Staying down a touch longer will help you catch it crisp.",
      "You come up {in} through the ball. Let's keep your eyes on the ball a fraction longer.",
      "Your head lifts {in} at impact, which is a lovely thing to work on.",
    ],
    // {in}
    "hip-sway-good": [
      "Your hips turn nicely without sliding away from the target.",
      "Great hip turn: you rotate instead of swaying, which keeps you centered.",
      "Your hips stay centered in the backswing, and that's a real strength.",
    ],
    "hip-sway": [
      "Your hips slide {in} away from the target in the backswing. Turning them instead of sliding is our opportunity.",
      "There's a {in} sway in your backswing. Feel like you turn in a barrel.",
      "Your hips drift {in} away from the target. A little more turn and a little less slide will help a lot.",
    ],
    // {deg}
    "shoulder-turn-good": [
      "You get a full shoulder turn, about {deg} degrees. Lovely.",
      "Your shoulders turn about {deg} degrees, a wonderful full backswing.",
      "That's a big, full shoulder turn of around {deg} degrees.",
    ],
    // {deg} {short}
    "shoulder-turn-short": [
      "Your shoulder turn looks like about {deg} degrees, roughly {short} short of full. Turning your back to the target will add power.",
      "You're turning your shoulders about {deg} degrees. A little more turn will let your body power the swing.",
      "Your shoulders turn about {deg} degrees, so there's room to turn {short} more.",
    ],
    // {deg}
    "reverse-tilt-good": [
      "At the top your upper body stays nicely behind the ball.",
      "Your spine is in a great position at the top, set up to shift forward.",
      "You stay behind the ball at the top, a really solid position.",
    ],
    "reverse-tilt": [
      "At the top you lean {deg} degrees toward the target. Staying a little more behind the ball is our opportunity.",
      "Your upper body tips {deg} degrees toward the target at the top. Let's keep your chest over your trail leg.",
      "There's {deg} degrees of reverse tilt at the top. Fixing it will help your weight move the right way.",
    ],
    // {ms}
    "sequencing-good": [
      "Your sequence is lovely: your hips start the downswing {ms} milliseconds before your arms.",
      "You start the downswing from the ground up, hips first. That's how good players build speed.",
      "Your hips lead the arms down, a wonderful sequence.",
    ],
    "sequencing": [
      "Your arms start down {ms} milliseconds before your hips. Letting the hips go first will add easy speed.",
      "Your arms beat your hips by {ms} milliseconds. Let's start the downswing from the ground up.",
      "The arms are firing first by about {ms} milliseconds. A hips-first feeling is a great next step.",
    ],
    // {in}
    "weight-good": [
      "Your weight shift is great, hips {in} toward the target by impact.",
      "You get your hips {in} forward by impact, which puts the low point in front of the ball.",
      "Lovely weight shift: {in} toward the target.",
    ],
    "weight-reverse": [
      "Your hips move {in} away from the target by impact, so your weight is going backward. Getting it moving forward is our big opportunity.",
      "By impact your hips are {in} behind where they started. Let's get your weight flowing toward the target.",
      "There's a reverse weight shift of {in}. Stepping toward the target will feel so much better.",
    ],
    "weight-back": [
      "Your hips only get {in} forward by impact. A bit more shift will help you strike it first.",
      "You move {in} toward the target, which is a start. Let's get a little more forward.",
      "Your weight shift is {in}, slightly light. More forward and you'll compress it.",
    ],
    // {in}
    "head-centered": [
      "Your head stays nicely centered through impact.",
      "I love how your head holds its place while your hips move forward.",
      "Your head stays steady and behind the ball, perfect.",
    ],
    "head-slide": [
      "Your head slides {in} toward the target by impact. Keeping it a bit more behind the ball will help.",
      "There's a {in} head slide forward. Let's let the hips move while the head stays put.",
      "Your head drifts {in} toward the target, which is easy to fix with a steady head feel.",
    ],
    "head-hang": [
      "Your head hangs back {in} at impact. Letting it move with your weight will help.",
      "Your head drifts {in} away from the target. Let's shift forward a touch more.",
      "There's {in} of hanging back with your head. Moving forward together is the goal.",
    ],
    // {angle}
    "release-good": [
      "Your arms extend beautifully after impact, within {angle} degrees of straight.",
      "You release the club fully down the line, lovely extension.",
      "Great extension through the ball, your lead arm stays long.",
    ],
    "chicken-wing": [
      "Your lead arm folds {angle} degrees after impact. Extending through will add distance.",
      "There's a bit of a chicken wing, {angle} degrees of bend after the ball. Let's let the arms extend.",
      "Your lead elbow bends {angle} degrees just after impact. Reaching toward the target will help.",
    ],
    // putt: {ratio} {back} {through}
    "putt-tempo-good": [
      "Your putting rhythm is lovely, {ratio} to 1. That makes your distance so repeatable.",
      "{back} seconds back and {through} through is a beautiful, even stroke rhythm.",
      "Your stroke tempo is a real strength at {ratio} to 1.",
    ],
    "putt-tempo-quick": [
      "Your backstroke is a little quick at {back} seconds, a {ratio} to 1 rhythm. Smoothing it out will help your distance.",
      "You snatch the putter back in {back} seconds. A slower take back is a great opportunity.",
      "Your rhythm is {ratio} to 1, so the backstroke is rushed. Let's make it as smooth as the forward stroke.",
    ],
    "putt-tempo-drag": [
      "Your forward stroke takes {through} seconds after a {back} second backstroke, so it's easing in. Let the putter swing through.",
      "The forward stroke drags at {ratio} to 1. Let's keep the same pace back and through.",
      "You're slowing into the ball, {through} seconds through. A freer stroke will help.",
    ],
    // {back} {through} {pct}
    "putt-length-good": [
      "Your follow-through matches your backstroke, {back} back and {through} through. Lovely pendulum.",
      "Your stroke length is beautifully balanced.",
      "{back} back and {through} through is the even stroke we want.",
    ],
    "putt-length-short": [
      "You go {back} back but only {through} through. Letting the putter finish will help it accelerate.",
      "Your follow-through is only {pct} percent of your backstroke. Let's let it swing through.",
      "The putter stops short after the ball, {through} through. A longer finish is the opportunity.",
    ],
    "putt-length-jab": [
      "Your backstroke is only {back} for {through} through, so you're jabbing a little. A longer, smoother take back will help.",
      "You take it back just {back} and push it {through}. Let's even those out.",
      "A short backstroke of {back} means you hit at the ball. More length back will feel smoother.",
    ],
    // {pct}
    "putt-accel-good": [
      "You accelerate through the ball beautifully, still at {pct} percent of top speed at impact.",
      "Your putter is still speeding up at impact, which is exactly right.",
      "Lovely acceleration through the ball.",
    ],
    // {pct} {slower} {ms}
    "putt-decel": [
      "Your putter slows down {slower} percent before impact. Let's keep it accelerating through.",
      "Your hands peak {ms} milliseconds early and arrive at {pct} percent speed. Swinging through will help.",
      "There's a little deceleration at the ball. Let the putter keep moving through.",
    ],
    // {in}
    "putt-head-good": [
      "Your head stays lovely and still through the stroke.",
      "Great stillness, your head barely moves.",
      "Your head stays quiet, giving the stroke a steady center.",
    ],
    "putt-head": [
      "Your head moves {in} during the stroke. Staying still will help you start it on line.",
      "There's {in} of head movement before impact. Let's keep your head quiet.",
      "Your head shifts {in}, so let's work on staying still until you hear it drop.",
    ],
    "putt-lower-good": [
      "Your lower body stays lovely and quiet.",
      "Great stable base, your legs and hips stay put.",
      "Your lower body is still and steady, perfect.",
    ],
    "putt-lower": [
      "Your hips and knees move {in} during the stroke. A quieter lower body will help.",
      "There's {in} of lower body movement. Let's keep the legs still.",
      "Your lower body sways {in}. Quieting it is an easy win.",
    ],
    // {deg}
    "triangle-good": [
      "Your arms and shoulders hold their triangle beautifully, within {deg} degrees.",
      "No wristy flick at all, lovely pendulum.",
      "Your triangle stays nice and solid through impact.",
    ],
    // {deg} {where}
    "putt-wrist": [
      "Your lead wrist changes {deg} degrees {where}. Keeping it quiet will make your stroke more consistent.",
      "There's {deg} degrees of wrist movement {where}. Let's keep the wrists out of it.",
      "Your lead wrist hinges {deg} degrees {where}, a great thing to tidy up.",
    ],
    "putt-triangle": [
      "Your hands move {deg} degrees off the triangle {where}. Letting the shoulders do the work will help.",
      "The triangle changes shape by {deg} degrees {where}. Let's keep it solid.",
      "Your arms add their own swing {where}, about {deg} degrees. Quieting them is the opportunity.",
    ],
    // {pct}
    "shoulders-good": [
      "{pct} percent of your stroke comes from your shoulders, a beautiful pendulum.",
      "Your shoulders rock the putter lovely and evenly.",
      "Great shoulder rock, {pct} percent of the motion.",
    ],
    "shoulders-arms": [
      "Only {pct} percent of your stroke comes from your shoulders. Letting them rock will make it repeatable.",
      "Your arms are doing most of the work, with shoulders at {pct} percent. Let's rock the shoulders more.",
      "With the shoulders giving {pct} percent, there's a lovely opportunity to let them lead.",
    ],
    "path-good": [
      "Your stroke goes straight back and through, lovely.",
      "Your putter stays nicely on line.",
      "Great path, straight back and straight through.",
    ],
    // {in}
    "path-cut": [
      "Your stroke cuts across the ball by about {in}. A straighter path will help it start on line.",
      "You go outside going back and inside through. Let's square that up.",
      "There's a bit of an out to in path. A track drill will help.",
    ],
    "path-in-out": [
      "Your stroke goes inside going back and out through, about {in}. Let's straighten it.",
      "You swing in to out by {in}. A straighter path is the opportunity.",
      "The path goes inside then out. Easy to tidy up.",
    ],
    "path-arc": [
      "Your stroke swings on a big arc, about {in}. A smaller arc will help it start on line.",
      "There's {in} of arc in your stroke. Let's keep it straighter.",
      "Your putter swings around a lot, {in} off line. A gate will help.",
    ],
    "path-out": [
      "Your hands move {in} out toward the ball. Keeping them steady will help.",
      "Your hands drift {in} out during the stroke. Let's keep them on line.",
      "There's {in} of outward drift. A quieter path will help.",
    ],
    "eyes-good": [
      "Your eyes are right over the ball, lovely setup.",
      "Great eye line, you see the line the putter is aimed on.",
      "Your eyes are perfectly over the ball.",
    ],
    // {in}
    "eyes-outside": [
      "Your eyes are {in} outside the ball. Stepping back a touch will help you see the line.",
      "You're crowding the ball a bit, eyes {in} beyond it. Let's back off slightly.",
      "Your eyes sit {in} past the ball. A small adjustment will make your aim easier.",
    ],
    "eyes-inside": [
      "Your eyes are {in} inside the ball. Moving them over the ball will help your aim.",
      "Your eye line is {in} inside. A little closer will make the line look true.",
      "With your eyes {in} inside, let's scoot in a touch.",
    ],
  },
  shots: {
    "tempo-rushed": [
      "A rushed backswing means your arms start down before your body is ready, so contact gets a little hit or miss. Smooth tempo gives you more solid shots.",
      "When the backswing hurries, timing gets harder, which shows up as pulls and thin shots. Slowing down will make your ball striking more reliable.",
      "Rushing to the top makes the downswing a scramble, so the club face is hard to square. Give it time and you'll see straighter shots.",
    ],
    "tempo-slow": [
      "Easing into the ball costs club speed and can leave the face open, so shots drift right. Letting it go will add distance.",
      "A slow downswing tends to hold the face open, which leads to weak fades. A freer swing will help.",
      "When the downswing slows down, you lose speed and the ball goes shorter. Let it swing.",
    ],
    "over-the-top": [
      "Coming over the top swings the club across the ball, which gives you pulls and slices. Dropping the hands first fixes the path.",
      "That outward move puts the club on an out to in path, the classic slice. Fixing it will straighten your ball flight.",
      "Over the top usually means pulls left or slices right. Once the hands drop, the ball starts straighter.",
    ],
    "under-plane": [
      "When the club gets stuck behind you, the face is hard to square, so you'll see pushes and hooks. Keeping your hands in front helps.",
      "Coming from too far inside leads to pushes, hooks and heavy shots. A better position will tighten your dispersion.",
      "Getting stuck makes you flip the hands to save it, which leads to hooks. Fixing it will steady your misses.",
    ],
    "takeaway-inside": [
      "A takeaway that whips inside sets the club flat, and then it often loops over the top. That leads to pulls and slices.",
      "Starting inside means the swing has to reroute later, which hurts consistency. A neutral start makes everything easier.",
      "When the club goes back inside, the downswing often comes over the top, giving you a pull.",
    ],
    "takeaway-outside": [
      "Pushing the club outside sets it steep, which makes an out to in path and slices likely.",
      "An outside takeaway often leads to a steep downswing and pulls. Turning it back will help.",
      "Starting outside usually means coming down steep, giving you divots that are too deep and slices.",
    ],
    "lead-arm": [
      "A bent lead arm shortens your swing, and straightening it again by impact is a timing move that causes thin and fat shots.",
      "Losing width at the top costs distance and consistency. A wider arc gives you more solid contact.",
      "When the lead arm folds, the bottom of the swing moves around, so contact gets less predictable.",
    ],
    posture: [
      "Your setup decides how you turn, so posture problems show up as thin or fat shots. Fixing setup is the easiest win in golf.",
      "A setup that's off makes you compensate during the swing, which leads to inconsistent contact.",
      "Good posture lets you turn and stay in balance, so fixing it improves contact right away.",
    ],
    "early-extension": [
      "Standing up through impact takes away the room your arms need, so you'll flip your hands or hit it thin or off the toe. Staying down gives you solid contact.",
      "Early extension leads to blocks right and hooks left, because your hands have to save the shot. Holding posture makes it repeatable.",
      "When your hips move toward the ball, the club gets crowded, which causes shanks, thin shots and blocks.",
    ],
    "head-height": [
      "When your head moves up or down, the bottom of the swing moves too, so you'll hit it fat or thin. A steady head means steady contact.",
      "Changing head height changes where the club hits the ground, which shows up as chunks and tops.",
      "A steady head height keeps the low point in the same place, so contact gets so much more reliable.",
    ],
    "head-lateral": [
      "When your head slides, your low point moves, so contact gets fat or thin. A steady head helps you find the ball.",
      "Head movement sideways changes where the swing bottoms out, which leads to pulls and fat shots.",
      "Keeping your head steady keeps the strike in one place, which makes every shot more solid.",
    ],
    "hip-sway": [
      "Swaying off the ball means you have to slide back to hit it, so you'll see blocks and hooks when the timing is off.",
      "A hip sway moves your swing center, which makes contact less predictable.",
      "Sliding instead of turning costs power and makes timing tricky, which leads to pushes.",
    ],
    "weight-shift": [
      "When your weight stays back, the club bottoms out before the ball, giving you fat and thin shots. Getting forward lets you hit ball then turf.",
      "Hanging back means the low point is behind the ball, the most common cause of chunked shots.",
      "Weight that doesn't get forward costs you compression and distance.",
    ],
    "reverse-tilt": [
      "Leaning toward the target at the top makes your weight fall back on the way down, so you'll hit it fat, thin or weak.",
      "Reverse tilt sets your weight up to go the wrong way, which costs distance and contact.",
      "When your upper body tips forward at the top, the downswing reverses, giving you weak, high shots.",
    ],
    "shoulder-turn": [
      "A short shoulder turn means your arms have to make the swing, and arm swings tend to come over the top.",
      "Without a full turn you lose power, and the arms take over, which can cause slices.",
      "A bigger turn gives you more speed and a better path.",
    ],
    "trail-knee": [
      "When the trail leg straightens, the hips spin and rise, which makes it hard to keep your posture coming down. That leads to thin and blocked shots.",
      "Losing trail knee flex lets the body stand up early, a common cause of early extension.",
      "A straightening trail leg costs you stability and power in the backswing.",
    ],
    sequencing: [
      "When the arms start first, the club gets thrown out over the plane, which leads to pulls and slices, and you lose speed.",
      "Arms-first downswings cost distance, because the lower body has nothing left to add.",
      "Starting down with the arms is a big reason for over the top swings.",
    ],
    "chicken-wing": [
      "A folding lead arm holds the face open and costs distance, so you'll see weak fades and thin shots.",
      "When the arm pulls in after impact, the club doesn't release, which leads to slices.",
      "The chicken wing steals speed right where you need it most.",
    ],
    "finish-balance": [
      "An unbalanced finish usually means something pulled you off balance before impact, which makes contact inconsistent.",
      "If you can't hold your finish, your swing is fighting you, and that shows up as mishits.",
      "Balance at the finish is the sign of a repeatable swing, so working on it helps every shot.",
    ],
    "putt-tempo": [
      "An uneven rhythm makes the hit at the ball set your distance, which is why lag putts end up long or short.",
      "When the tempo changes, so does your speed, making distance control tricky.",
      "Smooth rhythm is the secret to good speed control on the greens.",
    ],
    "putt-stillness": [
      "When your body moves, the putter moves off line, so putts start left or right of where you aimed.",
      "Movement during the stroke changes where you strike the ball, which affects both line and speed.",
      "Staying still means your putter returns where you aimed it.",
    ],
    "wrist-breakdown": [
      "When the wrists break down, they add loft and turn the face, so the ball comes off differently every time.",
      "Wristy strokes make speed and line inconsistent, especially under pressure.",
      "Quiet wrists mean a putter face that stays square.",
    ],
    "putt-length": [
      "A stroke that's out of balance in length usually means the putter is slowing down or jabbing, which hurts distance control.",
      "Uneven stroke length makes it hard to repeat your speed.",
      "Matching back and through makes the putter swing, so distance becomes predictable.",
    ],
    "shoulder-rock": [
      "When the arms do the work, the stroke gets harder to repeat under pressure, which costs you short putts.",
      "An arms-led stroke changes from putt to putt, making speed and line inconsistent.",
      "A shoulder-led stroke is the most repeatable way to roll it.",
    ],
    "putt-path": [
      "A path that's off line starts putts left or right of your target, even with a square face.",
      "When the stroke curves, the ball picks up sidespin and misses the line.",
      "A straight path helps every putt start where you aimed.",
    ],
    "eye-line": [
      "When your eyes aren't over the ball, the line you see isn't the line you're aimed on, so you miss before you even start.",
      "An eye line that's off makes your aim look different from reality, which leads to pushes and pulls.",
      "Getting your eyes over the ball helps you see the true line.",
    ],
    "putt-decel": [
      "A putter that slows down at the ball lets the face twist, so putts wobble off line and come up short.",
      "Decelerating makes speed hard to judge, which is why putts come up short.",
      "Accelerating through the ball keeps the face square and the speed true.",
    ],
  },
  talk: {
    openIssues: [
      "What a great start, let's take a look at this one together.",
      "Thanks for sharing this {shot}, there's a lot to like here.",
      "Okay, I watched it, and you've got a solid base to build on.",
    ],
    openClean: [
      "Wow, this is a really solid {shot}!",
      "I've watched it, and honestly, I'm smiling.",
      "What a lovely {shot} to start with.",
    ],
    breakdownIntro: [
      "Here's the full picture, starting with the good stuff.",
      "Let's walk through it together.",
      "Sure! Here's how it all fits together.",
    ],
    breakdownClean: [
      "Nothing in this {shot} stands out as a problem, so keep grooving it.",
      "There's nothing clear to fix here, which is a real win.",
      "No clear problems at all, so celebrate that and keep practicing.",
    ],
    alsoIssue: ["One more thing to keep an eye on.", "There's also a smaller opportunity.", ""],
    openClose: [
      "Tap a question below and we'll dig in.",
      "Ask me anything below when you're ready.",
      "Pick a question below and we'll keep going.",
    ],
    focusIntro: [
      "The one thing I'd work on first is {label}.",
      "If we pick just one thing, let's make it {label}.",
      "Our first project is {label}, because it will help the most.",
    ],
    focusEffects: [
      "The bonus is that {effects} should improve along with it.",
      "Fix this and {effects} will likely clean up too.",
      "It's connected to {effects}, so you'll get two wins for one.",
    ],
    cue: ["Here's a feel to try: {cue}", "A lovely feel for this: {cue}", "Try this: {cue}"],
    noFocus: [
      "Honestly, there's nothing clear to fix, so just keep grooving this {shot}.",
      "Nothing stands out as a problem, so enjoy it and keep practicing.",
      "Your {shot} has no clear problems, so keep doing what you're doing.",
    ],
    onlyHints: [
      "There's nothing certain to fix, but the camera hinted at {label}, so check it on the video.",
      "The only thing that showed up was a low confidence hint about {label}, so let's double check it first.",
      "Nothing is certain enough to fix, though {label} might be worth a look on the video.",
    ],
    strengthsIntro: [
      "Oh, there's plenty to celebrate.",
      "I'm so glad you asked, you do a lot well.",
      "Let me brag about you for a second.",
    ],
    noStrengths: [
      "The camera couldn't measure your strengths clearly this time, but every swing has them, so try another angle.",
      "I couldn't read clear strengths in this video, so let's try another clip and find them.",
      "This video didn't show your strengths clearly, so let's film another one and celebrate them.",
    ],
    drillIntro: [
      "For {label}, try the {drill} drill.",
      "Here's a lovely drill for {label}: {drill}.",
      "Let's work on {label} with {drill}.",
    ],
    drillBody: ["{how} Aim for {reps}.", "{how} Try {reps}.", "{how} Start with {reps}."],
    noDrill: [
      "Nothing needs fixing, so just hit some balls with a smooth rhythm and enjoy it.",
      "Your {shot} doesn't need a fix drill right now, so play some practice holes in your head and keep it smooth.",
      "There's nothing to drill right now, so enjoy a relaxed bucket with your smooth {shot}.",
    ],
    shotsNone: [
      "Nothing in this {shot} is causing bad shots that I can see, so any misses are probably just normal golf.",
      "I can't point to anything here that causes bad shots, which is great news.",
      "Nothing here should be causing bad shots, so trust your {shot} out there.",
    ],
    hypeOpen: [
      "You know what? You're getting better every time you film one of these.",
      "Listen, the fact that you're working on this already puts you ahead.",
      "I'm genuinely proud of you for putting in this work.",
    ],
    hypeClose: [
      "Go out there and enjoy it, you've got this!",
      "Keep showing up and this {shot} will keep getting better.",
      "Every rep counts, and you're putting them in. Let's go!",
    ],
    lowConfidence: [
      "The camera wasn't completely sure about {label}, so take this as a hint.",
      "This one's a gentle hint, since {label} was hard to see clearly.",
      "Check this on the video, because I'm not fully sure about {label}.",
    ],
    hidden: [
      "I couldn't see {labels} clearly enough to say anything.",
      "The video wasn't clear enough to judge {labels}.",
      "A few things were too unclear to judge: {labels}.",
    ],
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// SARGE: brutal drill sergeant. Roasts the golf, never the person. PG-13.
// The advice underneath every insult is still the real fix.
// ═════════════════════════════════════════════════════════════════════════════

const SARGE: CoachBank = {
  results: {
    "tempo-good": [
      "Your tempo is {ratio} to 1. Fine, that's good. Don't get excited, a metronome could do it too.",
      "{back} seconds back, {down} down, {ratio} to 1. Congratulations, you can count. It's the only thing you can do.",
      "Tempo's {ratio} to 1, right where it belongs. Enjoy it, it's the last nice thing I'm saying.",
    ],
    "tempo-rushed": [
      "Your backswing took {back} seconds. My grandma's walker moves faster than that, and she still beats your tempo. Slow it down by {extra} seconds, recruit.",
      "{ratio} to 1? You're yanking that club back like it owes you money. Give it {extra} more seconds before you panic.",
      "{back} seconds to the top. Where's the fire, cadet? Add {extra} seconds and let your body show up to the fight.",
    ],
    "tempo-slow": [
      "Your downswing takes {down} seconds. I've seen glaciers attack faster. Let it go from the top!",
      "{ratio} to 1, so you're tiptoeing into the ball like it might bite. Commit to the swing, soldier!",
      "{down} seconds coming down after a {back} second backswing. Are you swinging or sightseeing?",
    ],
    "finish-good": [
      "You held your finish, {in} of movement. Great, you can stand still. A statue does that all day.",
      "Balanced finish. Don't let it go to your head, the rest of the swing had to happen first.",
      "You held the pose. Nice. Shame the camera can't see where the ball went.",
    ],
    "finish-back-foot": [
      "Your hips finished {pct} percent of the way forward. Did you forget the front foot exists? Get your weight all the way over it!",
      "{pct} percent forward at the finish. You're hanging back like you're scared of the target. Move it!",
      "You finish {pct} percent of the way there. That's not a finish, that's a retreat.",
    ],
    "finish-wobble": [
      "You moved {in} after your finish. You looked like a folding table in a windstorm. Hold it!",
      "{in} of wobble after the swing. Did the ground move or did you? Stand still and own it!",
      "Your finish drifted {in}. I've seen newborn deer with better balance. Hold it for three seconds!",
    ],
    "posture-good": [
      "Posture's good, {tilt} degrees of tilt. Wow, you can stand in the right shape. A mannequin can too.",
      "{tilt} degrees of tilt and {flex} in the knees. Solid setup. It's what happens next that worries me.",
      "Your address position is correct. Don't celebrate, nobody ever won a tournament at address.",
    ],
    "posture-upright": [
      "{tilt} degrees of spine tilt? You're standing like you're waiting for a bus. Bend from the hips!",
      "You're so upright at address I almost saluted you. Hinge forward, soldier!",
      "{tilt} degrees. That's not golf posture, that's a guy checking his phone. Get down over the ball!",
    ],
    "posture-bent": [
      "{tilt} degrees of tilt. You're bent over like you dropped your car keys. Stand up a bit!",
      "You're hunched at {tilt} degrees. You look like a question mark with a club. Ease up!",
      "Bent over {tilt} degrees? There's no room to turn in there. Stand taller!",
    ],
    "posture-straight-knees": [
      "{flex} degrees of knee flex. I've seen better posture on a folding chair. Bend those knees!",
      "Your knees are locked at {flex} degrees like a tin soldier. Soften them up!",
      "{flex} degrees? Those legs are stiffer than your excuses. Flex the knees!",
    ],
    "posture-squat": [
      "{flex} degrees of knee flex? Are you golfing or waiting for a toilet? Stand up {over} degrees!",
      "You're squatting at address like you're about to catch a fastball. Rise up {over} degrees, catcher!",
      "{flex} degrees deep. You're sitting in an invisible chair, and your hips can't turn from there. Stand up!",
    ],
    "takeaway-good": [
      "Your takeaway's on path. Great, the first two feet of the swing work. Only the rest left to fix.",
      "Neutral takeaway. Fine. Even a broken clock gets the first move right.",
      "The takeaway is good. Enjoy it, because it's the most boring part of the swing.",
    ],
    "takeaway-inside": [
      "Your hands whip {in} inside by hip height. You're wrapping that club around you like a scarf. Keep it in front!",
      "{in} inside on the takeaway. Who taught you that, a revolving door? Keep the club head outside your hands!",
      "You yank it {in} inside right away and then spend the rest of the swing apologizing for it. Fix it!",
    ],
    "takeaway-outside": [
      "Your hands shove {in} out toward the ball. Are you trying to hand it the club? Turn your chest to start it back!",
      "{in} outside on the takeaway. That's a slice being born, recruit. Turn, don't push!",
      "You push it {in} outside like you're opening a heavy door. Keep the hands close to your thigh!",
    ],
    "trail-knee-good": [
      "Trail knee kept its flex. One joint in your body knows what it's doing. Good for that knee.",
      "Your trail knee stayed bent, {after} degrees at the top. The knee's doing its job, so what's your excuse?",
      "Trail leg held. Congratulations, your knee is the most disciplined part of you.",
    ],
    "trail-knee": [
      "Your trail leg straightens {loss} degrees, from {before} to {after}. You're locking out like a lawn chair. Keep it flexed!",
      "{loss} degrees of trail knee gone in the backswing. Did it file for retirement? Keep that knee soft!",
      "Your trail knee goes from {before} to {after} degrees. That leg's standing up before you've even started down. Brace it!",
    ],
    "lead-arm-good": [
      "Lead arm's wide at the top, {angle} degrees of bend. Nice. One straight arm doesn't make a swing though.",
      "Good width at the top. Too bad width doesn't fix everything else.",
      "Only {angle} degrees of bend. Look at you, an arm that listens. The rest of you could learn from it.",
    ],
    "lead-arm": [
      "Your lead arm bends {angle} degrees at the top. That's not a swing, that's a chicken flapping. Keep it wide!",
      "{angle} degrees of bend in the lead arm. You're folding like a cheap lawn chair. Shorten the swing and keep it straight!",
      "{angle} degrees? I asked for a golf swing, not a bicep curl. Width, soldier!",
    ],
    "plane-good": [
      "Hands drop on plane to start down. Wow. That's the bare minimum and you met it. Gold star.",
      "Transition's on plane. Fine. I'll find something else to yell about.",
      "You start down on plane. Don't look so proud, that's literally the job.",
    ],
    "over-the-top": [
      "Your hands push {in} out to start down. Over the top, cadet! That's how slices get made. Drop the hands first!",
      "{in} out toward the ball from the top. You're casting like you're fishing for compliments. Drop it into the slot!",
      "You throw it {in} over the top like you're trying to hit the ball with the clubhouse. Drop the hands to your back pocket!",
    ],
    "under-plane": [
      "Your hands drop {in} behind you. You're stuck worse than a car in a mud pit. Keep the hands in front of your chest!",
      "{in} behind your body to start down. Who put the club back there, a pickpocket? Keep it in front!",
      "Stuck {in} inside. You're going to need a rescue team for that club. Hands in front!",
    ],
    "early-ext-good": [
      "You held your posture through impact. Look at that, you can stay bent over for one whole second.",
      "Spine angle held, hips stayed back. Fine. I'm sure you'll find a new way to mess up.",
      "You stayed in your posture. Don't break your arm patting yourself on the back.",
    ],
    "early-ext-both": [
      "You stand up {deg} degrees and shove your hips {in} at the ball. Are you hitting a golf shot or trying to bump open a door? Stay down!",
      "Hips {in} toward the ball and {deg} degrees of standing up. You pop up like a jack in the box every swing. Keep your backside back!",
      "{deg} degrees up and {in} forward. Your swing stands up faster than a recruit at reveille. Stay in your posture!",
    ],
    "early-ext-spine": [
      "You stand up {deg} degrees through impact, from {before} to {after}. Sit back down, nobody dismissed you!",
      "{deg} degrees of standing up at the ball. You're popping up like toast. Hold your angle!",
      "Your spine rises {deg} degrees. You looked up before the job was done, soldier. Stay down!",
    ],
    "early-ext-hips": [
      "Your hips push {in} toward the ball. Is the ball paying you to get closer? Keep the hips back!",
      "{in} of hips crowding the ball. Give your arms some room, recruit!",
      "Your hips jump {in} at the ball like it's the last cookie. Stay back!",
    ],
    "head-height-good": [
      "Head height stayed steady. Great, your head can sit still. Now get the rest of you to listen.",
      "Steady head. Fine. Even a bobblehead stops sometimes.",
      "Your head stayed level. Somebody alert the media.",
    ],
    "head-dip": [
      "Your head drops {in}. Are you ducking incoming fire? Stay tall!",
      "{in} of head dip. You're sinking like a bad investment. Keep your height!",
      "Your head drops {in} on the way down. The ground isn't going to come to you. Stay up!",
    ],
    "head-rise": [
      "Your head pops up {in} at impact. Were you checking if anyone was watching? Stay down!",
      "{in} up through the ball. You look up faster than a kid hearing an ice cream truck. Hold it!",
      "Head rises {in}. The ball isn't going anywhere until you hit it, so stay down!",
    ],
    "hip-sway-good": [
      "Your hips turn without swaying. Finally, something in your swing knows the difference between turning and sliding.",
      "No real sway. Good. Write that down, it won't happen often.",
      "Hips stayed centered. Wow. Don't get used to compliments.",
    ],
    "hip-sway": [
      "Your hips slide {in} away from the target. You're swaying like a palm tree in a hurricane. Turn, don't slide!",
      "{in} of sway. Are you swinging or line dancing? Turn in a barrel!",
      "Your hips drift {in} off the ball. You left the building before you even swung. Stay centered!",
    ],
    "shoulder-turn-good": [
      "Full shoulder turn, about {deg} degrees. Great flexibility. Too bad flexibility isn't a scoring stat.",
      "About {deg} degrees of turn. Good. Now do something useful with it.",
      "You turn your shoulders fully. Congratulations, you can face backward.",
    ],
    "shoulder-turn-short": [
      "Your shoulders turn about {deg} degrees. That's not a backswing, that's a shrug. Turn your back to the target!",
      "About {deg} degrees of turn, {short} short. Did your shoulders forget to show up? Turn!",
      "{deg} degrees? My office chair turns more than that. Get your back to the target!",
    ],
    "reverse-tilt-good": [
      "You stay behind the ball at the top. Correct. Want a medal for doing the obvious?",
      "Good spine position at the top. One position down, about a hundred to go.",
      "Upper body stays back at the top. Fine. Don't let it go to your head.",
    ],
    "reverse-tilt": [
      "You lean {deg} degrees toward the target at the top. You're tipping over like the Leaning Tower of Bad Golf. Stay behind the ball!",
      "{deg} degrees of reverse tilt. Your weight's going the wrong way, cadet. Chest over the trail leg!",
      "You tilt {deg} degrees at the target at the top. Are you trying to get there before the ball does? Stay back!",
    ],
    "sequencing-good": [
      "Your hips start the downswing first. Great sequencing. Even a broken clock gets the order right sometimes.",
      "Hips beat the arms by {ms} milliseconds. Proper sequence. I'm almost impressed. Almost.",
      "Ground-up sequence. Good. Now if only the rest of you followed orders like your hips.",
    ],
    "sequencing": [
      "Your arms start down {ms} milliseconds before your hips. Your arms are going rogue, soldier. Hips first!",
      "Arms beat the hips by {ms} milliseconds. Who's in charge here? Start from the ground up!",
      "Your arms fire {ms} milliseconds early like a nervous rookie. Let the hips lead!",
    ],
    "weight-good": [
      "Good weight shift, {in} forward. Wow, you moved toward the target. That's literally where the ball's going.",
      "Hips {in} forward by impact. Fine. Glad something's moving in the right direction.",
      "Weight shift's good. I'm running out of things to yell about here, and I hate it.",
    ],
    "weight-reverse": [
      "Your hips go {in} AWAY from the target by impact. Wrong way, recruit! The target's the other direction!",
      "{in} of reverse weight shift. You're backing away from the ball like it's a snake. Move forward!",
      "Your weight goes {in} backward. Are you hitting a golf ball or running from it? Get forward!",
    ],
    "weight-back": [
      "Your hips get only {in} forward. That's a weight shift for ants. Get over your front foot!",
      "{in} forward. I've seen people lean further to grab the remote. Shift, soldier!",
      "Only {in} toward the target. You're hanging back like you're scared of commitment. Get forward!",
    ],
    "head-centered": [
      "Head stayed centered. Good. Your head is the most disciplined thing out here.",
      "Steady head through impact. Fine, you can keep your head. Now keep your cool.",
      "Head held its place. Nice. Don't expect a parade.",
    ],
    "head-slide": [
      "Your head slides {in} toward the target. Where are you going? The ball's right there! Keep your head back!",
      "{in} of head slide. Your head's trying to beat the ball to the green. Stay behind it!",
      "Your head drifts {in} forward like it's late for chow. Hold it still!",
    ],
    "head-hang": [
      "Your head hangs back {in}. You're leaning away like the ball told a bad joke. Move with it!",
      "{in} of hanging back. Commit to the shot, soldier!",
      "Your head drifts {in} away from the target. You're retreating mid-swing. Get forward!",
    ],
    "release-good": [
      "Arms extended through the ball. Nice extension. Shame it took the whole swing to get there.",
      "Lead arm stays straight after impact. Good. Your arms finally showed some backbone.",
      "Full release. Fine. Write it down, it's rare.",
    ],
    "chicken-wing": [
      "Your lead arm folds {angle} degrees after impact. That's a chicken wing, and I don't want fried chicken on my range. Extend!",
      "{angle} degrees of bend after the ball. Your elbow is running for cover. Reach for the target!",
      "Chicken wing, {angle} degrees. Bawk bawk, recruit. Extend those arms!",
    ],
    "putt-tempo-good": [
      "Putting rhythm's {ratio} to 1. Fine. A grandfather clock could do it too, and it doesn't complain.",
      "{back} back, {through} through. Good rhythm. Don't let it go to your head, it's a putter.",
      "Your stroke tempo is right. I'm almost disappointed I can't yell.",
    ],
    "putt-tempo-quick": [
      "Your backstroke takes {back} seconds. You're snatching it back like someone's stealing your putter! Smooth it out!",
      "{ratio} to 1. That backstroke is quicker than your excuses. Slow it down!",
      "{back} seconds back. Are you putting or swatting a fly? Easy does it!",
    ],
    "putt-tempo-drag": [
      "Your forward stroke takes {through} seconds. It's a putt, not a funeral procession. Let it swing!",
      "{ratio} to 1. You're easing into the ball like you're scared to wake it up. Swing through!",
      "{through} seconds through. The ball's falling asleep waiting for you. Keep the pace!",
    ],
    "putt-length-good": [
      "Back and through match, {back} and {through}. Fine, you can make a pendulum. Clocks have been doing it for centuries.",
      "Even stroke length. Good. Even your putter has better balance than your full swing.",
      "Follow-through matches the backstroke. I'll allow it.",
    ],
    "putt-length-short": [
      "{back} back but only {through} through. You stop the putter like you hit a wall. Follow through!",
      "Follow-through is {pct} percent of the backstroke. Did you run out of putter? Swing through it!",
      "Only {through} through. You're quitting on the putt, recruit. Finish it!",
    ],
    "putt-length-jab": [
      "{back} back and {through} through. You're jabbing at the ball like it insulted you. Longer backstroke!",
      "Tiny backstroke, big push. That's not a stroke, that's a poke. Smooth it out!",
      "{back} back. You're stabbing at it, soldier. Take it back and let it swing!",
    ],
    "putt-accel-good": [
      "Accelerating through impact, {pct} percent of top speed. Good. At least the putter is brave.",
      "Putter's speeding up at the ball. Correct. That's the job.",
      "You accelerate through it. Fine. I'll go find something else to complain about.",
    ],
    "putt-decel": [
      "Your putter slows down {slower} percent before the ball. You're putting the brakes on like you saw a cop! Accelerate!",
      "Top speed {ms} milliseconds early and you arrive at {pct} percent. You're chickening out at the ball! Swing through!",
      "Decelerating into the ball. Commit, soldier! Scared putts don't drop!",
    ],
    "putt-head-good": [
      "Head stayed still. Great, your head knows how to sit still. Shame about the rest of your golf.",
      "Quiet head. Fine. Statues are quiet too.",
      "Your head barely moved. One body part following orders.",
    ],
    "putt-head": [
      "Your head moves {in} during the stroke. Who are you looking for, a waiter? Keep it still!",
      "{in} of head movement. You're peeking before you hit it. Listen for it to drop!",
      "Your head shifts {in}. It's a putt, not a tennis match. Hold still!",
    ],
    "putt-lower-good": [
      "Lower body stayed quiet. Good. Your legs have discipline. Unlike your scorecard.",
      "Stable base. Fine. Glad your knees can stand still.",
      "Legs stayed put. I'll give the legs a medal.",
    ],
    "putt-lower": [
      "Your hips and knees move {in}. It's a putt, not a dance recital! Keep your legs still!",
      "{in} of lower body sway. Are you putting or doing the hula? Quiet the legs!",
      "Your lower body moves {in}. Freeze from the waist down!",
    ],
    "triangle-good": [
      "Triangle held its shape. Geometry class finally paid off.",
      "No wrist flick. Good. Your wrists are better behaved than you.",
      "Solid triangle, within {deg} degrees. Fine. Don't get cocky.",
    ],
    "putt-wrist": [
      "Your lead wrist breaks {deg} degrees {where}. Your wrists are flopping like a fish on a dock. Lock them!",
      "{deg} degrees of wrist {where}. Who gave your wrists permission to move? Quiet them!",
      "Wrist hinge of {deg} degrees {where}. It's a putt, not a paintbrush. Firm wrists!",
    ],
    "putt-triangle": [
      "Your hands break the triangle {deg} degrees {where}. Your arms are freelancing. Let the shoulders work!",
      "{deg} degrees off the triangle {where}. Your arms didn't get the memo. Rock the shoulders!",
      "The triangle collapses {deg} degrees {where}. That's not a triangle anymore, that's modern art. Hold it!",
    ],
    "shoulders-good": [
      "{pct} percent from the shoulders. Proper pendulum. Even I can't argue with that, and I really want to.",
      "Shoulders rock the putter. Good. Finally, something big doing the work.",
      "Shoulder-led stroke. Fine. You get one compliment, and that was it.",
    ],
    "shoulders-arms": [
      "Only {pct} percent from your shoulders. Your arms are doing all the work like an intern. Rock the shoulders!",
      "Shoulders give {pct} percent. They're on vacation, soldier. Make them work!",
      "Arms-only putting, shoulders at {pct} percent. That falls apart under pressure. Shoulders!",
    ],
    "path-good": [
      "Straight back and through. Good. The putter knows where it's going, even if you don't.",
      "Path is on line. Fine. Now go make some putts.",
      "Straight path. Don't let it go to your head.",
    ],
    "path-cut": [
      "You cut across it by {in}. That putt's going left before you even look up. Straight back and through!",
      "Outside back, inside through. You're slicing a putt, recruit. That takes special talent. Fix it!",
      "Out to in by {in}. Your putter's taking the scenic route. Straighten it out!",
    ],
    "path-in-out": [
      "Inside back, outside through, {in} off. You're pushing putts right like it's your job. Straighten it!",
      "{in} in to out. That's a putt, not a draw. Square it up!",
      "Your path swings out {in}. Straight back, straight through, soldier!",
    ],
    "path-arc": [
      "Your putter swings a {in} arc. It's a putter, not a lasso. Straighten it!",
      "{in} of arc. You're swinging that putter like a gate. Tighten it up!",
      "Big arc, {in}. Unless your timing's perfect, and it isn't, putts start off line. Fix it!",
    ],
    "path-out": [
      "Your hands drift {in} out toward the ball. Where are you going with that? Stay on line!",
      "{in} of outward drift. Your hands are wandering off like a lost tourist. Keep them still!",
      "Hands push out {in}. Quit reaching, recruit!",
    ],
    "eyes-good": [
      "Eyes right over the ball. Great, you can see. Now try aiming.",
      "Eye line's correct. Fine. You've got one thing right before the putter even moves.",
      "Eyes over the ball. Good. Don't blink.",
    ],
    "eyes-outside": [
      "Your eyes are {in} outside the ball. You're crowding it like it owes you rent. Back off!",
      "{in} past the ball. You're hovering over it like a hawk. Step back!",
      "Eyes {in} beyond the ball. Give it some personal space, soldier!",
    ],
    "eyes-inside": [
      "Your eyes are {in} inside the ball. Are you scared of it? Get over the ball!",
      "{in} inside. You're aiming at a ball you can't even see properly. Move in!",
      "Eyes {in} inside the ball. Scoot in, recruit, it won't bite!",
    ],
  },
  shots: {
    "tempo-rushed": [
      "When you rush the backswing, your arms start down before your body's even awake. That's pulls, thin shots and a lot of looking for your ball in the trees.",
      "Rushed backswing means your timing's a coin flip. Heads you hit it thin, tails you pull it into the parking lot.",
      "You hurry to the top, then you scramble coming down, and the face is anywhere but square. That's why your ball goes everywhere.",
    ],
    "tempo-slow": [
      "Easing into the ball kills your speed and leaves the face open. That's a weak slice that couldn't break a window.",
      "A lazy downswing loses distance and the ball drifts right. You're leaving yards on the range like spare change.",
      "Slow downswing, slow ball, short shot. It's not complicated, recruit.",
    ],
    "over-the-top": [
      "Over the top swings the club across the ball. That's a slice, recruit, the kind that ends up two fairways over.",
      "Out to in means pulls left and slices right. Pick one, because you're hitting both.",
      "Coming over the top is how you slice it into somebody's backyard. Drop the hands!",
    ],
    "under-plane": [
      "When the club gets stuck behind you, the face can't square. Pushes, hooks and fat shots, the full buffet.",
      "Stuck club means you flip the hands to save it, and hello, snap hook.",
      "From too far inside you either push it or hook it. That's not a miss pattern, that's chaos.",
    ],
    "takeaway-inside": [
      "Whip it inside and the club has to loop over the top coming down. That's pulls and slices, cadet.",
      "Your takeaway starts a swing that has to reroute. Every reroute is another chance to hit it sideways.",
      "Inside takeaway, over the top downswing, ball in the woods. Classic.",
    ],
    "takeaway-outside": [
      "Push it outside and you come down steep. Deep divots and slices, recruit.",
      "Outside takeaway sets up an out to in swing. Enjoy slicing.",
      "Steep from the start means you chop at it. That's not golf, that's lumberjacking.",
    ],
    "lead-arm": [
      "A bent lead arm means you have to straighten it again by impact. Miss that timing and you hit it fat or thin. You miss it a lot.",
      "No width, no distance, no consistency. Three for three, recruit.",
      "Folding arm, moving low point, random contact. Keep it wide!",
    ],
    posture: [
      "Bad setup means you compensate the whole swing. That's thin and fat shots before you even start.",
      "Your posture decides how you turn, and right now it's deciding wrong. Fat and thin, all day.",
      "Setup problems are the easiest to fix and you still haven't. That's why contact's a mess.",
    ],
    "early-extension": [
      "Standing up through impact steals the room your arms need. So you flip, you block it, you shank it. Pick your poison.",
      "Early extension is thin shots, toe shots and blocks right. You're basically trying every miss on the menu.",
      "Hips into the ball means the club gets crowded. Ever hit a shank? That's where they come from.",
    ],
    "head-height": [
      "Head moves up or down, the bottom of the swing moves with it. Fat, thin, topped. You're bouncing like a basketball.",
      "Change your head height, change where the club hits the ground. That's why your divots are a random number generator.",
      "Dip and you chunk it. Rise and you top it. Hold still!",
    ],
    "head-lateral": [
      "Head slides, low point slides, contact goes to pieces. Fat and pulled, soldier.",
      "When your head wanders, so does the strike. Stop sightseeing!",
      "A moving head moves the bottom of the swing. That's chunks and pulls.",
    ],
    "hip-sway": [
      "Sway off the ball and you have to slide back perfectly to hit it. You won't. Blocks and hooks.",
      "Swaying moves your whole swing off the ball. Then you're guessing where the bottom is. Badly.",
      "Sliding costs power and timing. That's a weak push into the right rough.",
    ],
    "weight-shift": [
      "Weight stuck back means the club bottoms out behind the ball. Fat shots, thin shots, and a lot of turf flying.",
      "Hanging back is the number one way to chunk it. And you're excellent at it.",
      "No weight shift, no compression. You're hitting it like a pillow fight.",
    ],
    "reverse-tilt": [
      "Lean toward the target at the top and your weight falls back on the way down. Fat, thin, weak. A trifecta.",
      "Reverse tilt means you're hitting from your back foot. That's no distance and no contact.",
      "Your weight's going backward through the ball. That's weak, high, short. Embarrassing.",
    ],
    "shoulder-turn": [
      "No shoulder turn, so your arms do all the work, and arm swings come over the top. Slice city.",
      "Short turn means short drives. You're leaving yards in the parking lot.",
      "Turn your back or the arms take over. And your arms are terrible at it.",
    ],
    "trail-knee": [
      "Trail leg straightens, hips spin and rise, posture's gone. Thin shots and blocks, recruit.",
      "Lose the trail knee and you stand up coming down. That's early extension's best friend.",
      "A locked trail leg gives you nothing to push against. No power, no posture.",
    ],
    sequencing: [
      "Arms first throws the club over the top and kills your speed. Pulls, slices, and short drives.",
      "When the arms go first, the legs have nothing left to add. You're swinging with half an engine.",
      "Arms-first downswing is how you get over the top. Hips lead, soldier!",
    ],
    "chicken-wing": [
      "Chicken wing holds the face open and kills distance. Weak fades and thin shots, the whole coop.",
      "Arm pulls in, club doesn't release, ball slices. That's the bird's whole story.",
      "Folding the arm after impact steals your speed right where it counts.",
    ],
    "finish-balance": [
      "If you can't hold the finish, something knocked you off balance before impact. That's mishits waiting to happen.",
      "Wobbly finish means a wobbly swing. And wobbly swings hit it sideways.",
      "No balance at the finish, no consistency in the shot.",
    ],
    "putt-tempo": [
      "Uneven rhythm means the hit sets your distance. That's why you leave it short, then blast it past.",
      "Change the tempo, change the speed. You three-putt because you can't keep a beat.",
      "No rhythm, no distance control. Every lag putt's a lottery ticket.",
    ],
    "putt-stillness": [
      "You move, the putter moves, the putt misses. It's not rocket science, recruit.",
      "Body moving means the face moves. That's left and right lip-outs.",
      "Stay still or keep missing. Your call.",
    ],
    "wrist-breakdown": [
      "Wrists break down, face twists, loft changes. The ball comes off different every time.",
      "Flippy wrists fall apart under pressure. That's your missed three footers.",
      "Wristy stroke, random roll. Lock them!",
    ],
    "putt-length": [
      "Uneven stroke means you're either quitting or jabbing. Both kill distance control.",
      "Mismatched stroke length, mismatched speed. Three putt incoming.",
      "If the stroke's not even, the speed won't be either.",
    ],
    "shoulder-rock": [
      "Arms-led strokes crumble under pressure. That's the short putt you choke.",
      "When the arms do the work, every stroke's different. So is every miss.",
      "Shoulders are repeatable. Arms aren't. Do the math.",
    ],
    "putt-path": [
      "Off-line path starts putts off line. Even a perfect read won't save you.",
      "Your putter's curving, so the ball starts wrong. Straighten it out!",
      "Bad path, bad start line, missed putt.",
    ],
    "eye-line": [
      "Eyes not over the ball means you're aiming at the wrong line before you even start. Brilliant.",
      "Bad eye line, bad aim, missed putt. You're beating yourself before the stroke.",
      "You can't hit a line you can't see properly.",
    ],
    "putt-decel": [
      "Slowing down at the ball lets the face twist and leaves putts short. Never up, never in, recruit!",
      "Deceleration is fear, and fear makes putts come up short.",
      "Quit on the putt and it quits on you.",
    ],
  },
  talk: {
    openIssues: [
      "Alright, I watched your {shot}. I need a minute. And maybe a nap.",
      "Attention! I've reviewed your {shot}, and I have concerns. Many concerns.",
      "I watched it. I can't unwatch it. Let's get to work.",
      "I watched your {shot} and I need a minute, recruit.",
      "Attention, I've seen your {shot} and I have concerns!",
    ],
    openClean: [
      "I watched your {shot} and I couldn't find a real problem. I'm furious about it.",
      "No clear faults. Don't celebrate, I'll find something next time.",
      "I hate to say it, but there's nothing to yell about here. Yet.",
      "No clear faults, and I'm furious about it.",
    ],
    breakdownIntro: [
      "Fine, here's the damage report.",
      "You want the breakdown? Brace yourself.",
      "Listen up, here's what's going on.",
      "Damage report, coming up.",
    ],
    breakdownClean: [
      "Nothing to fix. I'm as surprised as you are. Keep grooving it before you ruin it.",
      "No clear problems, which means you're out of excuses. Keep it up.",
      "I've got nothing. Don't make me regret it.",
    ],
    alsoIssue: ["And another thing.", "Oh, I'm not done.", "Next problem."],
    openClose: [
      "Pick a question below. Move it!",
      "Questions? Hit a button, recruit.",
      "Push a button below, I don't have all day.",
    ],
    focusIntro: [
      "Your first mission is {label}. Everything else waits.",
      "Job one: {label}. Fix it or don't come back.",
      "Priority target, {label}. That's where we start.",
    ],
    focusEffects: [
      "Fix it and {effects} will probably clean up too. Two birds, one drill.",
      "It's also dragging {effects} down with it.",
      "It's the root of {effects} too, so fixing it gets you a two for one.",
    ],
    cue: ["Here's your feel, recruit: {cue}", "Your orders: {cue}", "Swing thought, and you'd better use it: {cue}"],
    noFocus: [
      "I've got nothing. No clear faults. Go hit balls before I find one.",
      "Nothing to fix. Don't get comfortable, soldier.",
      "No problems to report. Ugh. Keep grooving it.",
    ],
    onlyHints: [
      "Nothing definite to fix. The camera thinks {label} might be off, but even it isn't sure. Check the video.",
      "Only a shaky hint about {label}. Check it on the video before I start yelling.",
      "The camera's mumbling something about {label}, but it's not sure. Go check the tape, recruit.",
    ],
    strengthsIntro: [
      "Fine. You did a few things right. Don't let it go to your head.",
      "You want compliments? Fine, here's what didn't make me cry.",
      "Good stuff? Ugh, okay.",
    ],
    noStrengths: [
      "Strengths? The camera couldn't measure any clearly. Neither could I.",
      "I couldn't read any clear strengths in this video. Film a better one.",
      "No clear strengths on camera. Give me a better video and maybe I'll find one.",
    ],
    drillIntro: [
      "Drill for {label}: {drill}. No complaining.",
      "Here's your punishment for {label}: {drill}.",
      "For {label}, you're doing {drill}. Now.",
    ],
    drillBody: ["{how} Give me {reps}. Go!", "{how} {reps}, and I'm counting.", "{how} {reps}. No breaks."],
    noDrill: [
      "Nothing to fix, so go hit balls with a smooth tempo until your hands hurt.",
      "No drill needed. Don't get lazy, go play nine.",
      "Nothing to drill. Fine, go hit fifty balls and hold every finish.",
    ],
    shotsNone: [
      "I can't find anything in this {shot} causing bad shots. If you're still hitting them, that's on you, not your {shot}.",
      "Nothing here explains a bad shot. So stop blaming the swing.",
      "This {shot} isn't the reason for your bad shots. Look in the mirror, soldier.",
    ],
    hypeOpen: [
      "You want a roast? Fine.",
      "Roast? Oh, I've been waiting for this.",
      "Alright, sit down, this is going to hurt.",
    ],
    hypeClose: [
      "Now get out there and prove me wrong.",
      "Fix it and maybe, MAYBE, I'll stop yelling.",
      "Dismissed. Go practice.",
    ],
    lowConfidence: [
      "The camera's not even sure about {label}, so maybe you got lucky.",
      "This one's shaky, the camera couldn't see {label} clearly. Check it before you cry about it.",
      "Low confidence on {label}, so don't quote me. Yet.",
    ],
    hidden: [
      "The video was too blurry to judge {labels}. Film it properly next time, recruit.",
      "Couldn't see {labels} clearly. Get a better camera angle.",
      "Too blurry to judge {labels}. Hold the camera still next time.",
    ],
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// THE CADDIE: laid back, dry humor, simple feels, course wisdom, no jargon.
// ═════════════════════════════════════════════════════════════════════════════

const CADDIE: CoachBank = {
  results: {
    "tempo-good": [
      "Your rhythm's {ratio} to 1. That's a swing you can take to the first tee on a nervous morning.",
      "{back} seconds back, {down} down. Nice and unhurried, the way a swing ought to be.",
      "Good tempo, {ratio} to 1. Rhythm travels, and yours will hold up under pressure.",
    ],
    "tempo-rushed": [
      "Backswing takes {back} seconds. Nobody's waiting on you, take an extra {extra} seconds and let it breathe.",
      "{ratio} to 1. You're in a hurry to get to the top, like the cart girl's leaving. Ease up.",
      "You get to the top in {back} seconds. Slow down, the ball's not going anywhere.",
    ],
    "tempo-slow": [
      "Downswing takes {down} seconds. Let it go, you already paid for the round.",
      "{ratio} to 1, so you're easing into it. Swing like you mean it.",
      "{down} seconds coming down. You're steering it. Let it fly.",
    ],
    "finish-good": [
      "Held your finish nice and still. Pose for the cameras, that's a keeper.",
      "Good balanced finish, only {in} of wobble. Means you swung within yourself.",
      "You held the finish. Hard to hit it bad when you can do that.",
    ],
    "finish-back-foot": [
      "Hips finish {pct} percent of the way forward. Feel like you walk after it, belt buckle at the target.",
      "You're finishing on your back foot, {pct} percent forward. Get all the way over the front foot.",
      "{pct} percent forward at the end. Finish like you're posing for the club photo, weight on the lead leg.",
    ],
    "finish-wobble": [
      "Moved {in} after the finish. If you can't hold it, you swung too hard. Swing at eighty percent.",
      "{in} of wobble at the end. Hold it for a three count, like it's a postcard.",
      "You drift {in} after the swing. Swing smooth enough to hold your pose.",
    ],
    "posture-good": [
      "Good athletic setup, {tilt} degrees of tilt. You look like you know what you're doing, and that's half the battle.",
      "Setup's solid. Arms hanging, knees soft. Good start.",
      "Nice posture at address. Some folks never get that part right.",
    ],
    "posture-upright": [
      "Standing tall at {tilt} degrees. Bow to the ball a little, like you're greeting it.",
      "You're upright as a flagstick at address. Tip from the hips and let the arms hang.",
      "{tilt} degrees. Feel like you're stepping up to a pool table, not a bus stop.",
    ],
    "posture-bent": [
      "{tilt} degrees of tilt. You're hunched over it like you're reading the fine print. Stand up a touch.",
      "Bent over a lot there. Stand up a little and give yourself room to turn.",
      "{tilt} degrees. Ease up, you're not looking for a lost ball.",
    ],
    "posture-straight-knees": [
      "Knees at {flex} degrees, pretty stiff. Soften them, like you're about to return a serve.",
      "Locked knees at {flex} degrees. Give them a little bend, it's golf, not a march.",
      "{flex} degrees of knee flex. Unlock them and you'll feel more athletic.",
    ],
    "posture-squat": [
      "Knees at {flex} degrees, you're sitting down on it. Stand up about {over} degrees, like you're perched on a barstool.",
      "Sitting low at address. Rise up a touch and your hips can turn.",
      "{flex} degrees deep. Feel taller, like you're leaning on a bar, not sitting in a chair.",
    ],
    "takeaway-good": [
      "Takeaway's on track. Start it right and the rest of the swing usually follows.",
      "Good start back. Club goes where it's supposed to.",
      "Your takeaway's nice and neutral. One less thing to think about.",
    ],
    "takeaway-inside": [
      "You whip the hands {in} inside. Feel like you push the club straight back low and slow.",
      "Club goes {in} behind you early. Keep it in front of your chest a little longer.",
      "{in} inside on the way back. Feel like the club head stays outside your hands.",
    ],
    "takeaway-outside": [
      "Hands push {in} out early. Feel like your chest takes it back, not your hands.",
      "{in} outside on the takeaway. Keep your hands close to your trail pocket.",
      "Club goes out {in}. Turn your shoulders and let the club come with you.",
    ],
    "trail-knee-good": [
      "Back knee held its flex. Good, gives you something to push off.",
      "Your trail knee stayed soft, like a coiled spring.",
      "Trail leg held, {after} degrees at the top. That's your brace, and it held.",
    ],
    "trail-knee": [
      "Trail knee straightens {loss} degrees going back. Feel like you keep a little sit in that back leg.",
      "Back leg goes stiff, from {before} to {after}. Feel like the knee stays pointed at the ball.",
      "{loss} degrees lost in the trail knee. Keep that knee soft like you're on a boat.",
    ],
    "lead-arm-good": [
      "Lead arm stays wide at the top. That's a big arc, and big arcs go far.",
      "Good width, {angle} degrees of bend. Nice wide swing.",
      "Your front arm stays long. That's where distance comes from.",
    ],
    "lead-arm": [
      "Lead arm folds {angle} degrees at the top. Feel like a wide swing that stops a little shorter.",
      "{angle} degrees of bend up top. Think wide, not long.",
      "Front arm bends {angle} degrees. Swing to three quarters and keep it wide.",
    ],
    "plane-good": [
      "You start down nice. Hands drop and the club falls into the slot.",
      "Good start to the downswing. The club drops right in.",
      "Your transition's smooth. Club drops in like it's supposed to.",
    ],
    "over-the-top": [
      "Hands push {in} out to start down. Feel like your hands drop into your back pocket first.",
      "{in} out from the top. Feel like the club falls behind you before you turn.",
      "You come over the top by {in}. Feel like you swing out to right field.",
    ],
    "under-plane": [
      "Hands drop {in} behind you. Feel like your hands stay in front of your belt buckle.",
      "Club gets stuck {in} inside. Feel like you turn your chest through faster.",
      "{in} behind you coming down. Keep the hands in front of your chest.",
    ],
    "early-ext-good": [
      "You stayed in your posture through the ball. Hard to hit it bad from there.",
      "Held your angle through impact. That's a ball striker's move.",
      "Kept your backside back through the ball. Nice.",
    ],
    "early-ext-both": [
      "You stand up {deg} degrees and your hips bump {in} at the ball. Feel like your backside stays on the wall through impact.",
      "Hips move {in} toward the ball and you rise {deg} degrees. Feel like you sit back into a barstool as you swing.",
      "{deg} degrees up, {in} closer. Feel like your belt buckle turns to the target, not toward the ball.",
    ],
    "early-ext-spine": [
      "You stand up {deg} degrees through the ball. Feel like your chest stays over the ball longer.",
      "{deg} degrees of standing up. Stay in your posture till the ball's gone.",
      "Rising {deg} degrees at impact. Feel like you're hitting it from under a low ceiling.",
    ],
    "early-ext-hips": [
      "Your hips push {in} toward the ball. Feel like your backside stays against the wall.",
      "Hips move {in} closer at impact. Turn them, don't bump them.",
      "{in} of hip crowding. Feel like you're closing a car door with your back hip.",
    ],
    "head-height-good": [
      "Head height stays steady. Means you come back to the ball where you started.",
      "Your head stays level. Good, steady eyes, steady contact.",
      "Head stays put. Nice and quiet.",
    ],
    "head-dip": [
      "Head drops {in}. Feel like you swing under a low ceiling and don't bump it either way.",
      "You sink {in}. Stay tall like a bartender reaching for the top shelf.",
      "{in} of dip. Feel like your head's a candle that shouldn't drip.",
    ],
    "head-rise": [
      "Head comes up {in}. Keep looking at the back of the ball till it's gone.",
      "You rise {in} at impact. Trust it'll go, you don't need to check.",
      "{in} up at the ball. Let your eyes stay down a beat longer.",
    ],
    "hip-sway-good": [
      "Hips turn without sliding. Good, you stay over the ball.",
      "Nice turn, no sway. Stayed in your barrel.",
      "Hips stay centered. Good.",
    ],
    "hip-sway": [
      "Hips slide {in} away from the target. Feel like you turn in a barrel.",
      "{in} of sway. Feel like your back pocket goes behind you, not sideways.",
      "You drift {in} off the ball. Turn, don't slide.",
    ],
    "shoulder-turn-good": [
      "Full shoulder turn, about {deg} degrees. Back to the target, good.",
      "Nice big turn. That's free distance.",
      "You turn your back fully. That's where the power hides.",
    ],
    "shoulder-turn-short": [
      "About {deg} degrees of turn. Feel like your back faces the target at the top.",
      "Turn's a little short, about {deg} degrees. Feel like your lead shoulder goes under your chin.",
      "{deg} degrees of turn. Turn a bit more and let the body do the work.",
    ],
    "reverse-tilt-good": [
      "You stay behind the ball at the top. Good spot to swing from.",
      "Upper body stays back at the top. Nice.",
      "Good position at the top, chest over your back leg.",
    ],
    "reverse-tilt": [
      "You lean {deg} degrees toward the target at the top. Feel like your chest stays over your back foot.",
      "{deg} degrees of lean at the top. Feel like you're behind the ball looking at it.",
      "Tipping {deg} degrees forward up top. Keep your head behind the ball.",
    ],
    "sequencing-good": [
      "Hips start the downswing before the arms. That's free speed.",
      "Good order, lower body first. Feet, hips, then hands.",
      "Your hips lead by {ms} milliseconds. That's how it's supposed to go.",
    ],
    "sequencing": [
      "Arms beat the hips by {ms} milliseconds. Feel like your belt buckle beats your hands to the ball.",
      "Arms start first by {ms} milliseconds. Start the downswing with a little bump toward the target.",
      "Hands get out ahead, {ms} milliseconds. Feel like your hips pull the club down.",
    ],
    "weight-good": [
      "Good weight shift, hips {in} forward. You hit it from your front side.",
      "Hips get {in} toward the target. That's ball first, then turf.",
      "Nice shift forward. Good.",
    ],
    "weight-reverse": [
      "Hips go {in} back at impact. Feel like you step toward the target as you swing.",
      "Weight's going backward, {in}. Feel like you walk through it toward the hole.",
      "{in} the wrong way. Feel like you finish with your back toe on the ground and weight up front.",
    ],
    "weight-back": [
      "Only {in} forward at impact. Feel like you lean on the front leg.",
      "{in} toward the target. A little more, feel like you squash a bug with your front foot.",
      "Hips move {in} forward. Get over that front foot more.",
    ],
    "head-centered": [
      "Head stays centered. Good, steady.",
      "Your head holds its spot while your hips move. That's right.",
      "Head stays behind the ball. Nice.",
    ],
    "head-slide": [
      "Head slides {in} toward the target. Feel like your head stays behind the ball until it's gone.",
      "{in} of head slide forward. Let the hips go, keep the head home.",
      "Your head runs {in} ahead. Let it stay put a while.",
    ],
    "head-hang": [
      "Head hangs back {in}. Let it move with the hips.",
      "{in} of hanging back. Feel like you lean into the shot.",
      "Head drifts {in} away. Move with the ball.",
    ],
    "release-good": [
      "Arms extend through the ball. Club's chasing the target. Good.",
      "Nice release, arms long after the ball.",
      "Good extension, you let it go.",
    ],
    "chicken-wing": [
      "Lead arm folds {angle} degrees after impact. Feel like you shake hands with the target.",
      "{angle} degrees of bend after the ball. Feel like your arms chase the ball down the line.",
      "Chicken wing, {angle} degrees. Let the club swing your arms long.",
    ],
    "putt-tempo-good": [
      "Stroke rhythm's {ratio} to 1. Nice and steady, that's how you lag it close.",
      "Even rhythm back and through. Good speed control comes from that.",
      "{back} back, {through} through. Like a grandfather clock.",
    ],
    "putt-tempo-quick": [
      "Backstroke takes {back} seconds. Slow it down, think tick, tock.",
      "Quick take back at {ratio} to 1. Same pace back and through.",
      "You snatch it back in {back} seconds. Ease it back like you're not in a hurry.",
    ],
    "putt-tempo-drag": [
      "Forward stroke takes {through} seconds. Let the putter swing through like a pendulum.",
      "{ratio} to 1, so you're easing in. Same pace both ways.",
      "Dragging it through in {through} seconds. Let it swing.",
    ],
    "putt-length-good": [
      "Back and through match, {back} and {through}. Even stroke, even speed.",
      "Good stroke length. Swing it like a pendulum, and you are.",
      "Even back and through. Speed control's easy from there.",
    ],
    "putt-length-short": [
      "Back {back}, through only {through}. Let the putter finish past the ball.",
      "Follow-through's {pct} percent of the backstroke. Let it swing through to the hole.",
      "Short finish. Feel like the putter chases the ball.",
    ],
    "putt-length-jab": [
      "Only {back} back for {through} through. You're jabbing. Take it back a bit more and let it swing.",
      "Short back, long push. Feel like an even tick, tock.",
      "{back} back. Lengthen it and quit hitting at it.",
    ],
    "putt-accel-good": [
      "Putter's still speeding up at the ball, {pct} percent of top speed. That's how they hold their line.",
      "Good acceleration through it.",
      "You putt through the ball, not at it. Good.",
    ],
    "putt-decel": [
      "Putter slows {slower} percent before the ball. Feel like you're swinging through to a spot past it.",
      "You peak {ms} milliseconds early. Let the putter keep rolling through.",
      "Slowing down at the ball. Feel like the putter chases the ball.",
    ],
    "putt-head-good": [
      "Head stays still. Good, listen for it, don't watch it.",
      "Quiet head. Nice.",
      "Head doesn't budge. That's how you start it on line.",
    ],
    "putt-head": [
      "Head moves {in}. Listen for it to drop, don't watch it.",
      "{in} of head movement. Keep your eyes on the spot where the ball was.",
      "Head shifts {in}. Stay still till you hear it.",
    ],
    "putt-lower-good": [
      "Legs stay quiet. Good stable base.",
      "Lower body's still. Nice.",
      "Hips and knees stay put. Good.",
    ],
    "putt-lower": [
      "Hips and knees move {in}. Feel like your legs are in cement.",
      "{in} of lower body sway. Plant your feet and let the shoulders work.",
      "Lower body moves {in}. Quiet those legs.",
    ],
    "triangle-good": [
      "Triangle holds its shape. No flicky hands. Good.",
      "Arms and shoulders move together. Nice.",
      "Solid triangle, no wrist. Good.",
    ],
    "putt-wrist": [
      "Lead wrist moves {deg} degrees {where}. Feel like your wrists are in a cast.",
      "{deg} degrees of wrist {where}. Quiet hands, let the shoulders rock.",
      "Wrist breaks {deg} degrees {where}. Feel like the putter and your forearms are one piece.",
    ],
    "putt-triangle": [
      "Hands break the triangle {deg} degrees {where}. Feel like your arms are along for the ride.",
      "{deg} degrees off the triangle {where}. Let the shoulders do the work.",
      "Arms swing on their own {where}, about {deg} degrees. Rock the shoulders instead.",
    ],
    "shoulders-good": [
      "{pct} percent from the shoulders. Rock, don't hit. Nice.",
      "Shoulders rock the putter. That holds up under pressure.",
      "Good shoulder stroke.",
    ],
    "shoulders-arms": [
      "Only {pct} percent from the shoulders. Feel like your shoulders rock like a seesaw.",
      "Arms doing the work, shoulders at {pct} percent. Rock the shoulders.",
      "Shoulders give {pct} percent. Let them run it.",
    ],
    "path-good": [
      "Straight back and through. Good.",
      "Path's on line. Nice.",
      "Putter stays on line. Good.",
    ],
    "path-cut": [
      "Cutting across it by {in}. Feel like the putter goes straight down a train track.",
      "Outside back, inside through. Lay two clubs down as a track.",
      "Cutting across. Straight back, straight through.",
    ],
    "path-in-out": [
      "Inside back, outside through, about {in}. Feel like a straight track.",
      "In to out by {in}. Square it up.",
      "Path goes in then out. Straight back and through.",
    ],
    "path-arc": [
      "Big arc, about {in}. Feel like a smaller, straighter stroke.",
      "{in} of arc. Tighten it up.",
      "Swinging around a bit, {in}. Keep it straighter.",
    ],
    "path-out": [
      "Hands drift {in} out. Keep them under your shoulders.",
      "{in} of outward drift. Steady hands.",
      "Hands push out {in}. Keep them home.",
    ],
    "eyes-good": [
      "Eyes over the ball. You see the line you're aimed on.",
      "Good eye line. Nice.",
      "Eyes right over it.",
    ],
    "eyes-outside": [
      "Eyes {in} past the ball. Back off a touch.",
      "You're crowding it, eyes {in} beyond. Step back.",
      "Eyes {in} outside. Scoot back a hair.",
    ],
    "eyes-inside": [
      "Eyes {in} inside the ball. Scoot in a touch.",
      "{in} inside. Get over it more.",
      "Eyes {in} inside. Lean in a little.",
    ],
  },
  shots: {
    "tempo-rushed": [
      "Rush it and the timing goes. That's a pull into the left trees. On a tight hole, swing at eighty percent and find the short grass.",
      "Hurried swings miss both ways. When you're nervous on the tee, slow down, take one more club and swing easy.",
      "Quick swings hit it sideways. Out here, fairway beats distance.",
    ],
    "tempo-slow": [
      "Easing into it costs you yards and the ball leaks right. Aim a little left until it's fixed.",
      "Slow downswing, short shots. Club up until you let it go.",
      "Steering it leaks right. Commit to the swing.",
    ],
    "over-the-top": [
      "Over the top means a slice or a pull. Until it's fixed, tee it up on the right side and aim at the left edge.",
      "That move swings across the ball. Out here that's a slice into the right rough.",
      "Over the top slices it. Play for it until it's gone.",
    ],
    "under-plane": [
      "Stuck club means pushes and hooks. Pick a target and commit, don't steer.",
      "From inside you push it or hook it. Two-way misses are the worst, so fix this first.",
      "Getting stuck leads to hooks. Aim at the safe side.",
    ],
    "takeaway-inside": [
      "Start inside and the club loops over the top. That's pulls left.",
      "A bad start back means the swing has to fix itself. That's hit or miss.",
      "Inside takeaway, pulled shot.",
    ],
    "takeaway-outside": [
      "Outside takeaway, steep swing, slice. Play it to the left side until it's fixed.",
      "Steep from the start means big divots and slices.",
      "Starting outside leads to an out to in swing.",
    ],
    "lead-arm": [
      "Bent arm, short swing, random contact. Hit a club more and swing smooth.",
      "No width, no distance. That's an extra club on every approach.",
      "Folding arm means thin and fat shots.",
    ],
    posture: [
      "Setup's where it all starts. Get that right and half your misses go away.",
      "Bad posture leads to thin and fat shots. Easiest fix in golf.",
      "Fix the setup and the swing follows.",
    ],
    "early-extension": [
      "Standing up takes away room for your arms. That's blocks right and the occasional shank. Out here, keep it in play and fix it on the range.",
      "Early extension gives you thin shots and blocks. Aim for the fat part of the green.",
      "Hips into the ball means crowded club. That's where shanks come from.",
    ],
    "head-height": [
      "Head goes up and down, so does the bottom of your swing. Fat and thin. Play the middle of the green.",
      "Moving head, moving contact. Chunks and tops.",
      "Steady head, steady strike.",
    ],
    "head-lateral": [
      "Head slides, contact goes. Fat shots and pulls.",
      "A wandering head wanders the strike.",
      "Keep your head home and you'll find the ball.",
    ],
    "hip-sway": [
      "Sway off it and you have to slide back. Miss the timing and you push it right.",
      "Swaying costs power. Club up.",
      "Sliding leads to blocks and hooks.",
    ],
    "weight-shift": [
      "Weight back means fat shots. Out here, that's coming up short of the green, so take one more club.",
      "Hanging back chunks it. Ball first, then turf.",
      "No weight shift, no compression.",
    ],
    "reverse-tilt": [
      "Leaning forward at the top means you fall back coming down. Weak, high, short. Take more club.",
      "Reverse tilt gives you fat and thin.",
      "Weight goes the wrong way, ball goes nowhere.",
    ],
    "shoulder-turn": [
      "Short turn, short shots, and the arms take over. Club up.",
      "No turn, no power. Turn your back.",
      "Arms-only swings come over the top.",
    ],
    "trail-knee": [
      "Back leg straightens, you stand up. Thin shots and blocks.",
      "Lose the trail knee and you lose your posture.",
      "Straight back leg, no power.",
    ],
    sequencing: [
      "Arms first means over the top and less speed. Pulls and slices.",
      "Arms leading costs you yards.",
      "Let the hips go first and the ball goes farther.",
    ],
    "chicken-wing": [
      "Chicken wing holds the face open. Weak fade, short. Aim left and club up.",
      "Folding arm costs distance.",
      "No extension, no release, weak shot.",
    ],
    "finish-balance": [
      "If you can't hold your finish, you swung too hard. On the course, swing at eighty percent and hold it.",
      "Off balance at the end means off balance at impact.",
      "Hold your finish and your misses get smaller.",
    ],
    "putt-tempo": [
      "Uneven rhythm, uneven speed. That's how you three-putt. On long putts, just try to die it in a three foot circle.",
      "Rhythm controls distance. Lose it and you're blasting it past.",
      "No rhythm, no feel for speed.",
    ],
    "putt-stillness": [
      "Move and the putter moves. Putts start off line.",
      "Body movement, missed putts.",
      "Stay still and you'll make more.",
    ],
    "wrist-breakdown": [
      "Wristy strokes change the face. Ball comes off different every time.",
      "Flippy wrists miss short putts.",
      "Quiet wrists, square face.",
    ],
    "putt-length": [
      "Uneven stroke, uneven speed. Lag putts end up anywhere.",
      "Mismatched stroke, mismatched distance.",
      "Even stroke, even speed.",
    ],
    "shoulder-rock": [
      "Arms-only strokes fall apart under pressure. That's the three footer on eighteen.",
      "Arms change, shoulders don't.",
      "Shoulders are the steady way.",
    ],
    "putt-path": [
      "Off line path, off line putt.",
      "A curving stroke starts it wrong. Even a good read won't save it.",
      "Straight path, straight start.",
    ],
    "eye-line": [
      "Eyes not over the ball means your aim's off before you start.",
      "Bad eye line, bad aim.",
      "See the line, hit the line.",
    ],
    "putt-decel": [
      "Slowing at the ball means short putts. Never up, never in.",
      "Decelerating makes the face twist.",
      "Putt through it and it holds its line.",
    ],
  },
  talk: {
    openIssues: [
      "Alright, I've seen a lot of swings. Let's talk about this one.",
      "Watched it twice. Here's what I see.",
      "Seen worse. Seen better. Here's the deal.",
      "Seen a lot of swings, here's what I see in yours.",
    ],
    openClean: [
      "Not much for me to say. That's a good {shot}.",
      "Honestly, I'd carry your bag any day with that {shot}.",
      "I've got nothing to fix. Enjoy it.",
    ],
    breakdownIntro: [
      "Here's how I see it.",
      "Okay, here's the lay of the land.",
      "Let me give you the short version.",
    ],
    breakdownClean: [
      "No clear problems. Keep it simple and go play.",
      "Nothing to fix. Just play golf.",
      "Your {shot}'s fine. Go work on your short game.",
    ],
    alsoIssue: ["And one more.", "Also.", ""],
    openClose: [
      "Ask me something below.",
      "Hit a button if you want more.",
      "Got questions, I've got time.",
    ],
    focusIntro: [
      "First thing I'd fix is {label}.",
      "If I'm you, I work on {label} first.",
      "Start with {label}. Everything else follows.",
    ],
    focusEffects: [
      "Fix that and {effects} probably fixes itself.",
      "It's behind {effects} too.",
      "{effects} comes from the same place, so one fix gets both.",
    ],
    cue: ["Swing thought: {cue}", "Just feel this: {cue}", "Here's the feel: {cue}"],
    noFocus: [
      "Nothing clear to fix. Spend your time on wedges and putting, that's where the strokes are.",
      "No problems to report. Go practice your short game.",
      "Your {shot}'s fine. Work on course management, that's where the scores are.",
    ],
    onlyHints: [
      "Nothing definite. The camera thinks {label} might be off, but it's not sure. Check the video.",
      "Only a hint about {label}. Check it before you change anything.",
      "Maybe something with {label}, but the camera's guessing. Look at the video.",
    ],
    strengthsIntro: ["Here's what's working.", "Few things you do well.", "Good stuff, here you go."],
    noStrengths: [
      "Camera couldn't measure much clearly this time. Try another angle.",
      "Couldn't read any clear strengths. Film another one.",
      "Hard to say what's working from this one. Try another video.",
    ],
    drillIntro: [
      "For {label}, try {drill}.",
      "Here's one for {label}: {drill}.",
      "Work on {label} with {drill}.",
    ],
    drillBody: ["{how} Do {reps}.", "{how} About {reps}.", "{how} Start with {reps}."],
    noDrill: [
      "Nothing to fix. Go hit wedges to different targets, that's where scoring lives.",
      "No drill needed. Practice putting from six feet.",
      "Nothing to drill. Go chip to a towel for twenty minutes.",
    ],
    shotsNone: [
      "Nothing in this {shot} is causing bad shots. Your misses are probably just golf. Aim at the middle of greens.",
      "Can't find anything that'd cause a bad shot. Sometimes it's the club choice, not the swing.",
      "Nothing here causes bad shots. Check your aim and your club choice.",
    ],
    hypeOpen: [
      "Here's the honest truth.",
      "Let me tell you something.",
      "Been caddying a long time. Here's what I think.",
    ],
    hypeClose: [
      "Fairways and greens. That's the game.",
      "Keep it in play and you'll beat half the field.",
      "Play smart and the scores come.",
    ],
    lowConfidence: [
      "Camera's not sure about {label}, so take this with a grain of salt.",
      "Hard to tell about {label} from this video, so check it yourself.",
      "{label} was tough to see, so it's only a hint.",
    ],
    hidden: [
      "Couldn't see {labels} well enough to say.",
      "Video wasn't clear on {labels}.",
      "{labels} didn't show up clearly enough to judge.",
    ],
  },
};

export const COACH_LINES: Record<CoachId, CoachBank> = {
  sunny: SUNNY,
  sarge: SARGE,
  caddie: CADDIE,
};
