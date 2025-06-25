// import React from "react";

// const FriendRequestButton = ({ onClick, sent }) => {
//   return (
//     <button
//       onClick={onClick}
//       disabled={sent}
//       className={`mt-5 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center transition duration-200 ${
//         sent
//           ? "bg-green-100 text-green-700 cursor-not-allowed border border-green-400"
//           : "bg-blue-600 hover:bg-blue-700 text-white"
//       }`}
//     >
//       {sent ? (
//         <>
//           <svg
//             className="w-4 h-4 mr-2 text-green-600 animate-pulse"
//             fill="none"
//             stroke="currentColor"
//             strokeWidth="2"
//             viewBox="0 0 24 24"
//           >
//             <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
//           </svg>
//           Request Sent
//         </>
//       ) : (
//         "Send Request"
//       )}
//     </button>
//   );
// };

// export default FriendRequestButton;













import React from "react";

const FriendRequestButton = ({ onClick, sent }) => {
  return (
    <button
      onClick={onClick}
      disabled={sent}
      className={`w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center transition duration-200 ${
        sent
          ? "bg-green-100 text-green-700 cursor-not-allowed border border-green-400"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      {sent ? (
        <>
          <svg
            className="w-4 h-4 mr-2 text-green-600 animate-pulse"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Request Sent
        </>
      ) : (
        "Send Request"
      )}
    </button>
  );
};

export default FriendRequestButton;
